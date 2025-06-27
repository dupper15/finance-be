import { BaseRepository } from '../core/BaseRepository.js';

export class TagRepository extends BaseRepository {
    constructor(database) {
        super(database, 'tags');
    }

    async findByUserId(userId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .order('name');

        if (error) throw error;
        return data;
    }

    async findByUserAndId(userId, tagId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .eq('tag_id', tagId)
            .single();

        if (error) throw error;
        return data;
    }

    getPrimaryKey() {
        return 'tag_id';
    }
}
