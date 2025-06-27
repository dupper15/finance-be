import { User } from '../models/User.js';
import { NotFoundError } from '../core/NotFoundError.js';
import { UnauthorizedError } from '../core/UnauthorizedError.js';
import { ValidationError } from '../core/ValidationError.js';

export class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async getProfile(token) {
        try {
            const userData = await this.userRepository.findByToken(token);
            if (!userData) {
                throw new NotFoundError('User not found');
            }
            return new User(userData);
        } catch (error) {
            throw new UnauthorizedError('Invalid or expired token');
        }
    }

    async updateProfile(token, profileData) {
        // First get current user to validate
        const currentUser = await this.getProfile(token);

        // Create user object with new data for validation
        const updatedUserData = {
            ...currentUser,
            ...profileData
        };

        const user = new User(updatedUserData);
        const errors = user.validate();

        if (errors.length > 0) {
            throw new ValidationError('Profile validation failed', errors);
        }

        // Update user metadata in Supabase
        const supabaseUserData = {
            name: user.name,
            phone: user.phone,
            preferences: user.preferences
        };

        const updatedUser = await this.userRepository.updateProfile(token, supabaseUserData);
        return new User(updatedUser);
    }

    async changePassword(token, currentPassword, newPassword) {
        // Get current user
        const currentUser = await this.getProfile(token);

        // Verify current password
        try {
            await this.userRepository.verifyPassword(currentUser.email, currentPassword);
        } catch (error) {
            throw new UnauthorizedError('Current password is incorrect');
        }

        // Validate new password
        if (!newPassword || newPassword.length < 6) {
            throw new ValidationError('New password must be at least 6 characters long');
        }

        // Update password
        await this.userRepository.changePassword(token, newPassword);
        return { message: 'Password changed successfully' };
    }

    async getUserStats(userId) {
        const statsData = await this.userRepository.getUserStats(userId);

        const totalBalance = statsData.accounts.reduce((sum, account) =>
            sum + parseFloat(account.balance), 0
        );

        // Calculate monthly statistics
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const monthlyTransactions = statsData.transactions.filter(t =>
            new Date(t.transaction_date) >= currentMonth
        );

        const monthlyIncome = monthlyTransactions
            .filter(t => t.transaction_type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const monthlyExpenses = monthlyTransactions
            .filter(t => t.transaction_type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return {
            total_accounts: statsData.accounts.length,
            total_balance: totalBalance,
            total_transactions: statsData.transactions.length,
            total_budgets: statsData.budgets.length,
            monthly_income: monthlyIncome,
            monthly_expenses: monthlyExpenses,
            monthly_net: monthlyIncome - monthlyExpenses
        };
    }

    async deleteAccount(userId, token) {
        // Verify user ownership
        const currentUser = await this.getProfile(token);
        if (currentUser.user_id !== userId) {
            throw new UnauthorizedError('Cannot delete another user\'s account');
        }

        // Delete all user data first
        await this.userRepository.deleteUserData(userId);

        // Then delete the user account
        await this.userRepository.deleteUser(userId);

        return { message: 'Account deleted successfully' };
    }

    async getAccountSummary(userId) {
        const user = await this.getProfile(userId);
        const stats = await this.getUserStats(userId);

        return {
            user: user.toJSON(),
            stats
        };
    }
}