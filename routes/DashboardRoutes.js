import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';

export class DashboardRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('dashboardController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.use(authenticateToken);
        this.router.get('/', this.controller.getDashboard.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
