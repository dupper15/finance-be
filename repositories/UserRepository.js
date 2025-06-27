export class UserRepository {
    constructor(database) {
        this.db = database.getClient();
    }

    async findByToken(token) {
        const { data: { user }, error } = await this.db.auth.getUser(token);
        if (error) throw error;
        return user;
    }

    async updateProfile(token, profileData) {
        const { data, error } = await this.db.auth.updateUser({
            data: profileData
        });
        if (error) throw error;
        return data.user;
    }

    async changePassword(token, newPassword) {
        const { data, error } = await this.db.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data.user;
    }

    async verifyPassword(email, password) {
        const { data, error } = await this.db.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data.user;
    }

    async deleteUser(userId) {
        const { error } = await this.db.auth.admin.deleteUser(userId);
        if (error) throw error;
        return true;
    }

    async getUserStats(userId) {
        const [accountsResult, transactionsResult, budgetsResult] = await Promise.all([
            this.db
                .from('accounts')
                .select('account_id, balance')
                .eq('user_id', userId)
                .eq('is_active', true),
            this.db
                .from('transactions')
                .select('transaction_id, amount, transaction_type, transaction_date')
                .eq('user_id', userId),
            this.db
                .from('budgets')
                .select('budget_id')
                .eq('user_id', userId)
                .eq('is_active', true)
        ]);

        if (accountsResult.error) throw accountsResult.error;
        if (transactionsResult.error) throw transactionsResult.error;
        if (budgetsResult.error) throw budgetsResult.error;

        return {
            accounts: accountsResult.data,
            transactions: transactionsResult.data,
            budgets: budgetsResult.data
        };
    }

    async deleteUserData(userId) {
        // Delete user data in proper order (considering foreign key constraints)
        const deleteOperations = [
            this.db.from('transactions').delete().eq('user_id', userId),
            this.db.from('scheduled_transactions').delete().eq('user_id', userId),
            this.db.from('budgets').delete().eq('user_id', userId),
            this.db.from('accounts').delete().eq('user_id', userId),
            this.db.from('categories').delete().eq('user_id', userId),
            this.db.from('tags').delete().eq('user_id', userId)
        ];

        const results = await Promise.allSettled(deleteOperations);

        // Check for any failures
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            throw new Error(`Failed to delete some user data: ${failures.map(f => f.reason.message).join(', ')}`);
        }

        return true;
    }
}