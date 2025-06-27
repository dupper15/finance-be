import { BaseService } from '../core/BaseService.js';
import { Tag } from '../models/Tag.js';
import { NotFoundError } from '../core/NotFoundError.js';

export class TagService extends BaseService {
    constructor(tagRepository) {
        super(tagRepository, Tag);
        this.tagRepository = tagRepository;
    }

    async getByUserId(userId) {
        const tags = await this.tagRepository.findByUserId(userId);
        return tags.map(tag => new Tag(tag));
    }

    async getByUserAndId(userId, tagId) {
        const tag = await this.tagRepository.findByUserAndId(userId, tagId);
        if (!tag) {
            throw new NotFoundError('Tag not found');
        }
        return new Tag(tag);
    }

    async create(userId, tagData) {
        const data = { ...tagData, user_id: userId };
        return super.create(data);
    }

    async update(userId, tagId, tagData) {
        // Verify ownership
        await this.getByUserAndId(userId, tagId);
        
        const updatedTag = await this.tagRepository.update(tagId, tagData);
        return new Tag(updatedTag);
    }

    async delete(userId, tagId) {
        // Verify ownership
        await this.getByUserAndId(userId, tagId);
        
        return await this.tagRepository.delete(tagId);
    }
}
