import { BaseRepository } from '../core/BaseRepository.js';

export class BudgetRepository extends BaseRepository {
    constructor(database) {
        super(database, 'budgets');
    }

    async findByUserId(userId, includeInactive = false) {
        let query = this.db
            .from(this.tableName)
            .select(`
                *,
                accounts(name),
                categories(name)
            `)
            .eq('user_id', userId);

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async findByUserAndId(userId, budgetId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .eq('budget_id', budgetId)
            .single();

        if (error) throw error;
        return data;
    }

    async findActiveBudgets(userId) {
        const now = new Date().toISOString();
        
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .lte('start_date', now)
            .gte('end_date', now);

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'budget_id';
    }
}
