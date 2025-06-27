export class BaseRepository {
    constructor(database, tableName) {
        this.db = database.getClient();
        this.tableName = tableName;
    }

    async findAll(filters = {}, options = {}) {
        let query = this.db.from(this.tableName).select(options.select || '*');

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query = query.eq(key, value);
            }
        });

        // Apply ordering
        if (options.orderBy) {
            query = query.order(options.orderBy.field, { ascending: options.orderBy.ascending });
        }

        // Apply pagination
        if (options.limit) {
            const offset = options.offset || 0;
            query = query.range(offset, offset + options.limit - 1);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return { data, count };
    }

    async findById(id, options = {}) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select(options.select || '*')
            .eq(this.getPrimaryKey(), id)
            .single();

        if (error) throw error;
        return data;
    }

    async create(data) {
        const { data: result, error } = await this.db
            .from(this.tableName)
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async update(id, data) {
        const { data: result, error } = await this.db
            .from(this.tableName)
            .update(data)
            .eq(this.getPrimaryKey(), id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async delete(id) {
        const { data, error } = await this.db
            .from(this.tableName)
            .delete()
            .eq(this.getPrimaryKey(), id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async softDelete(id) {
        return this.update(id, { is_active: false });
    }

    getPrimaryKey() {
        return `${this.tableName.slice(0, -1)}_id`; // Remove 's' and add '_id'
    }
}
