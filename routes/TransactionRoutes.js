import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';
import {validateRequest, transactionSchema} from '../middleware/ValidationMiddleware.js';

export class TransactionRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('transactionController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        this.router.get('/', this.controller.getAll.bind(this.controller));
        this.router.get('/stats/summary', this.controller.getStatsSummary.bind(this.controller));
        this.router.get('/:id', this.controller.getById.bind(this.controller));
        this.router.post('/', validateRequest(transactionSchema), this.controller.create.bind(this.controller));
        this.router.put('/:id', validateRequest(transactionSchema), this.controller.update.bind(this.controller));
        this.router.delete('/:id', this.controller.delete.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
