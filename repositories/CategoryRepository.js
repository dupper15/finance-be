import { BaseRepository } from '../core/BaseRepository.js';

export class CategoryRepository extends BaseRepository {
    constructor(database) {
        super(database, 'categories');
    }

    async findByUserId(userId, includeDefaults = true) {
        let query = this.db
            .from(this.tableName)
            .select('*')
            .eq('is_delete', false);

        if (includeDefaults) {
            query = query.or(`user_id.eq.${userId},is_default.eq.true`);
        } else {
            query = query.eq('user_id', userId);
        }

        query = query.order('name');

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async findByUserAndId(userId, categoryId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .or(`user_id.eq.${userId},is_default.eq.true`)
            .eq('category_id', categoryId)
            .eq('is_delete', false)
            .single();

        if (error) throw error;
        return data;
    }

    async findByType(userId, type) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .or(`user_id.eq.${userId},is_default.eq.true`)
            .eq('type', type)
            .eq('is_delete', false)
            .order('name');

        if (error) throw error;
        return data;
    }

    async findDefaultCategories() {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('is_default', true)
            .eq('is_delete', false)
            .order('name');

        if (error) throw error;
        return data;
    }

    async findCategoriesWithBudgets(userId, month, year) {
        const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        const { data, error } = await this.db
            .from(this.tableName)
            .select(`
                *,
                budgets!inner (
                    budget_id,
                    name,
                    amount,
                    start_date,
                    end_date
                )
            `)
            .or(`user_id.eq.${userId},is_default.eq.true`)
            .eq('is_delete', false)
            .eq('budgets.is_delete', false)
            .gte('budgets.start_date', startDate.toISOString())
            .lt('budgets.start_date', endDate.toISOString())
            .order('name');

        if (error) throw error;
        return data;
    }

    async findSubcategories(parentCategoryId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('category_id')
            .eq('parent_category_id', parentCategoryId)
            .eq('is_delete', false);

        if (error) throw error;
        return data;
    }

    async softDelete(id) {
        const { data, error } = await this.db
            .from(this.tableName)
            .update({ is_delete: true })
            .eq('category_id', id)
            .eq('is_delete', false)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'category_id';
    }
}