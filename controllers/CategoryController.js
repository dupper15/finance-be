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
            const categoryData = {
                ...req.body,
                user_id: req.user.id, // Ensure user_id from token
                is_default: false,
                is_delete: false
            };

            const category = await this.categoryService.create(req.user.id, categoryData);

            res.status(201).json(category.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { name, type, description, color } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Thiếu name trong body'
                });
            }

            const updateData = {
                name,
                ...(type && { type }),
                ...(description && { description }),
                ...(color && { color })
            };

            const category = await this.categoryService.update(req.user.id, req.params.id, updateData);

            res.json(category.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await this.categoryService.softDelete(req.user.id, req.params.id);

            res.json({
                success: true,
                message: 'Xoá mềm category thành công',
                category: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getCategoriesByType(req, res, next) {
        try {
            const { type } = req.params;
            const categories = await this.categoryService.getCategoriesByType(req.user.id, type);

            res.json(categories.map(category => category.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    async getDefaultCategories(req, res, next) {
        try {
            const categories = await this.categoryService.getDefaultCategories();

            res.json(categories.map(category => category.toJSON()));
        } catch (error) {
            next(error);
        }
    }
}