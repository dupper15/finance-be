import { BaseRepository } from '../core/BaseRepository.js';

export class CategoryRepository extends BaseRepository {
    constructor(database) {
        super(database, 'categories');
    }

    async findByUserId(userId, includeDefaults = true) {
        let query = this.db
            .from(this.tableName)
            .select('*');

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
            .single();

        if (error) throw error;
        return data;
    }

    async findSubcategories(parentCategoryId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('category_id')
            .eq('parent_category_id', parentCategoryId);

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'category_id';
    }
}
