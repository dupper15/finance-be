import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';

export class ImportExportRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('importExportController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        this.router.post('/import/transactions',
            this.controller.getUploadMiddleware(),
            this.controller.importTransactions
        );

        this.router.get('/export/transactions',
            this.controller.exportTransactions
        );

        this.router.get('/export/budget-report',
            this.controller.exportBudgetReport
        );
    }

    getRouter() {
        return this.router;
    }
}