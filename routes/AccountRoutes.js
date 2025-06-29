import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';
import { validateRequest, accountSchema } from '../middleware/ValidationMiddleware.js';

export class AccountRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('accountController');
        this.setupRoutes();
    }

    setupRoutes() {
        // Apply authentication to all routes
        this.router.use(authenticateToken);

        this.router.get('/', this.controller.getAll.bind(this.controller));
      //  this.router.get('/:id', this.controller.getById.bind(this.controller));
        this.router.get('/:id', this.controller.getByUserId.bind(this.controller));
        this.router.post('/', validateRequest(accountSchema), this.controller.create.bind(this.controller));
        this.router.put('/:id', validateRequest(accountSchema), this.controller.update.bind(this.controller));
        this.router.delete('/:id', this.controller.delete.bind(this.controller));
        this.router.get('/:id/balance-history', this.controller.getBalanceHistory.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
