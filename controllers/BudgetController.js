import { BaseController } from '../core/BaseController.js';

export class BudgetController extends BaseController {
    constructor(budgetService) {
        super(null);
        this.budgetService = budgetService;
    }

    async getAll(req, res, next) {
        try {
            const budgets = await this.budgetService.getByUserId(req.user.id);
            
            res.json(budgets.map(budget => budget.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const budget = await this.budgetService.getByUserAndId(req.user.id, req.params.id);
            
            res.json(budget.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const budget = await this.budgetService.create(req.user.id, req.body);
            
            res.status(201).json(budget.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const budget = await this.budgetService.update(req.user.id, req.params.id, req.body);
            
            res.json(budget.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await this.budgetService.delete(req.user.id, req.params.id);
            
            res.json({ message: 'Budget deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getBudgetProgress(req, res, next) {
        try {
            const progress = await this.budgetService.getBudgetProgress(req.user.id, req.params.id);
            
            res.json(progress);
        } catch (error) {
            next(error);
        }
    }
}
