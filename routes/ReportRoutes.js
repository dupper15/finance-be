import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';

export class ReportRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('reportController');
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        this.router.get('/income-expense', this.controller.getIncomeExpenseReport.bind(this.controller));
        this.router.get('/expense-by-category', this.controller.getExpenseByCategoryReport.bind(this.controller));
        this.router.get('/account-balances', this.controller.getAccountBalancesReport.bind(this.controller));
        this.router.get('/monthly-trends', this.controller.getMonthlyTrendsReport.bind(this.controller));
        this.router.get('/budget-performance', this.controller.getBudgetPerformanceReport.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}
