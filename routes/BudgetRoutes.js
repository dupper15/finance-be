import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';
import {validateRequest, budgetSchema} from '../middleware/ValidationMiddleware.js';

export class BudgetRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('budgetController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        this.router.get('/', this.controller.getAll.bind(this.controller));
        this.router.get('/:id', this.controller.getById.bind(this.controller));
        this.router.post('/', validateRequest(budgetSchema), this.controller.create.bind(this.controller));
        this.router.put('/:id', validateRequest(budgetSchema), this.controller.update.bind(this.controller));
        this.router.delete('/:id', this.controller.delete.bind(this.controller));
        this.router.get('/:id/progress', this.controller.getBudgetProgress.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
