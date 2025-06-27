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
                categories(name, type, category_id, user_id, is_delete)
            `)
            .eq('user_id', userId)
            .eq('is_delete', false);

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
            .eq('is_delete', false)
            .single();

        if (error) throw error;
        return data;
    }

    async findByPeriod(userId, startDate, endDate) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select(`
                budget_id,
                name,
                description,
                amount,
                duration,
                start_date,
                end_date,
                account_id,
                category_id,
                created_at,
                updated_at,
                user_id,
                categories (
                    category_id,
                    name,
                    type,
                    created_at,
                    user_id,
                    is_delete
                )
            `)
            .eq('user_id', userId)
            .gte('start_date', startDate)
            .lt('start_date', endDate)
            .eq('is_delete', false)
            .eq('categories.is_delete', false)
            .order('created_at', { ascending: false });

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
            .eq('is_delete', false)
            .lte('start_date', now)
            .gte('end_date', now);

        if (error) throw error;
        return data;
    }

    async softDelete(id) {
        const { data, error } = await this.db
            .from(this.tableName)
            .update({ is_delete: true })
            .eq('budget_id', id)
            .eq('is_delete', false)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async findBudgetsByCategory(userId, categoryId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .eq('category_id', categoryId)
            .eq('is_delete', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'budget_id';
    }
}