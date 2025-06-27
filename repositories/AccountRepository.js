import { BaseRepository } from '../core/BaseRepository.js';

export class AccountRepository extends BaseRepository {
    constructor(database) {
        super(database, 'accounts');
    }

    async findByUserId(userId, includeInactive = false) {
        let query = this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId);

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async findByUserAndId(userId, accountId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .eq('account_id', accountId)
            .single();

        if (error) throw error;
        return data;
    }

    async getBalanceHistory(accountId, userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await this.db
            .from('transactions')
            .select('transaction_date, amount, transaction_type')
            .eq('account_id', accountId)
            .eq('user_id', userId)
            .gte('transaction_date', startDate.toISOString())
            .order('transaction_date', { ascending: true });

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'account_id';
    }
}
