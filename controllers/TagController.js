import { BaseController } from '../core/BaseController.js';

export class TagController extends BaseController {
    constructor(tagService) {
        super(null);
        this.tagService = tagService;
    }

    async getAll(req, res, next) {
        try {
            const tags = await this.tagService.getByUserId(req.user.id);
            
            res.json(tags.map(tag => tag.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const tag = await this.tagService.getByUserAndId(req.user.id, req.params.id);
            
            res.json(tag.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const tag = await this.tagService.create(req.user.id, req.body);
            
            res.status(201).json(tag.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const tag = await this.tagService.update(req.user.id, req.params.id, req.body);
            
            res.json(tag.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await this.tagService.delete(req.user.id, req.params.id);
            
            res.json({ message: 'Tag deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
