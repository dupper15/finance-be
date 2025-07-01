import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import Joi from 'joi';

export class CategoryRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('categoryController');
        this.setupValidationSchemas();
        this.setupRoutes();
    }

    setupValidationSchemas() {
        // Updated to match actual database schema - only name and type
        this.categorySchema = Joi.object({
            name: Joi.string().min(1).max(100).required(),
            type: Joi.string().valid('income', 'expense').required()
        });

        this.categoryUpdateSchema = Joi.object({
            name: Joi.string().min(1).max(100).required(),
            type: Joi.string().valid('income', 'expense').required()
        });
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        // Get all categories (includes defaults)
        this.router.get('/', this.controller.getAll.bind(this.controller));

        // Get category by ID
        this.router.get('/:id', this.controller.getById.bind(this.controller));

        // Create new category
        this.router.post('/',
            ValidationMiddleware.validateRequest(this.categorySchema),
            this.controller.create.bind(this.controller)
        );

        // Update category
        this.router.put('/:id',
            ValidationMiddleware.validateRequest(this.categoryUpdateSchema),
            this.controller.update.bind(this.controller)
        );

        // Soft delete category
        this.router.delete('/:id', this.controller.delete.bind(this.controller));

        // Get categories by type
        this.router.get('/type/:type', this.controller.getCategoriesByType.bind(this.controller));

        // Get default categories
        this.router.get('/defaults', this.controller.getDefaultCategories.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}