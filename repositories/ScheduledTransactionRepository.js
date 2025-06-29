import { BaseRepository } from '../core/BaseRepository.js';

export class ScheduledTransactionRepository extends BaseRepository {
    constructor(database) {
        super(database, 'scheduled_transactions');
    }

    async findByUserId(userId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select(`
                *,
                accounts!scheduled_transactions_account_id_fkey(name, account_type),
                categories(name),
                transfer_accounts:accounts!scheduled_transactions_transfer_account_id_fkey(name, account_type)
            `)
            .eq('user_id', userId)
            .order('next_due_date', { ascending: true });

        if (error) throw error;
        return data;
    }

    async findByUserAndId(userId, scheduledId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .eq('scheduled_id', scheduledId)
            .single();

        if (error) throw error;
        return data;
    }

    async findDueTransactions(cutoffDate = null) {
        const now = cutoffDate || new Date().toISOString();

        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('is_active', true)
            .lte('next_due_date', now);

        if (error) throw error;
        return data;
    }

    async findUpcoming(userId, daysAhead = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const { data, error } = await this.db
            .from(this.tableName)
            .select(`
                *,
                accounts!scheduled_transactions_account_id_fkey(name, account_type),
                transfer_accounts:accounts!scheduled_transactions_transfer_account_id_fkey(name, account_type)
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .gte('next_due_date', new Date().toISOString())
            .lte('next_due_date', futureDate.toISOString())
            .order('next_due_date');

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'scheduled_id';
    }
}