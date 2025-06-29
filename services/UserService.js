import { User } from '../models/User.js';
import { NotFoundError } from '../core/NotFoundError.js';
import { UnauthorizedError } from '../core/UnauthorizedError.js';
import { ValidationError } from '../core/ValidationError.js';

export class UserService {
    constructor(userRepository, twoFactorAuthRepository = null) {
        this.userRepository = userRepository;
        this.twoFactorAuthRepository = twoFactorAuthRepository;
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
        const currentUser = await this.getProfile(token);

        const updatedUserData = {
            ...currentUser,
            ...profileData
        };

        const user = new User(updatedUserData);
        const errors = user.validate();

        if (errors.length > 0) {
            throw new ValidationError('Profile validation failed', errors);
        }

        const supabaseUserData = {
            name: user.name,
            phone: user.phone,
            preferences: user.preferences
        };

        const updatedUser = await this.userRepository.updateProfile(token, supabaseUserData);
        return new User(updatedUser);
    }

    async changePassword(token, currentPassword, newPassword) {
        const currentUser = await this.getProfile(token);

        try {
            await this.userRepository.verifyPassword(currentUser.email, currentPassword);
        } catch (error) {
            throw new UnauthorizedError('Current password is incorrect');
        }

        if (!newPassword || newPassword.length < 6) {
            throw new ValidationError('New password must be at least 6 characters long');
        }

        await this.userRepository.changePassword(token, newPassword);
        return { message: 'Password changed successfully' };
    }

    async verifyPassword(email, password) {
        try {
            await this.userRepository.verifyPassword(email, password);
            return true;
        } catch (error) {
            throw new UnauthorizedError('Invalid password');
        }
    }

    async getUserStats(userId) {
        const statsData = await this.userRepository.getUserStats(userId);

        const totalBalance = statsData.accounts.reduce((sum, account) =>
            sum + parseFloat(account.balance), 0
        );

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
            totalBalance,
            accountsCount: statsData.accounts.length,
            monthlyIncome,
            monthlyExpenses,
            budgetsCount: statsData.budgets.length,
            transactionsCount: statsData.transactions.length
        };
    }

    async getAccountSummary(token) {
        const user = await this.getProfile(token);
        const stats = await this.getUserStats(user.user_id);

        let twoFactorStatus = null;
        if (this.twoFactorAuthRepository) {
            const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(user.user_id);
            twoFactorStatus = {
                isEnabled: twoFactorAuth ? twoFactorAuth.is_enabled : false,
                isSetup: !!twoFactorAuth
            };
        }

        return {
            user: user.toJSON(),
            stats,
            twoFactorAuth: twoFactorStatus
        };
    }

    async deleteAccount(token) {
        const user = await this.getProfile(token);

        if (this.twoFactorAuthRepository) {
            await this.twoFactorAuthRepository.deleteByUserId(user.user_id);
        }

        await this.userRepository.deleteUser(user.user_id);
        return { message: 'Account deleted successfully' };
    }
}