import { BaseController } from '../core/BaseController.js';

export class CategoryController extends BaseController {
    constructor(categoryService) {
        super(null);
        this.categoryService = categoryService;
    }

    async getAll(req, res, next) {
        try {
            const categories = await this.categoryService.getByUserId(req.user.id);
            
            res.json(categories.map(category => category.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const category = await this.categoryService.getByUserAndId(req.user.id, req.params.id);
            
            res.json(category.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const category = await this.categoryService.create(req.user.id, req.body);
            
            res.status(201).json(category.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const category = await this.categoryService.update(req.user.id, req.params.id, req.body);
            
            res.json(category.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await this.categoryService.delete(req.user.id, req.params.id);
            
            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
