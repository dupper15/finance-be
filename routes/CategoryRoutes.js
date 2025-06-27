import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';

export class CategoryRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('categoryController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        this.router.get('/', this.controller.getAll.bind(this.controller));
        this.router.get('/:id', this.controller.getById.bind(this.controller));
        this.router.post('/', this.controller.create.bind(this.controller));
        this.router.put('/:id', this.controller.update.bind(this.controller));
        this.router.delete('/:id', this.controller.delete.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
