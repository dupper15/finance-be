import { BaseController } from '../core/BaseController.js';

export class ScheduledTransactionController extends BaseController {
    constructor(scheduledTransactionService) {
        super(null);
        this.scheduledTransactionService = scheduledTransactionService;
    }

    async getAll(req, res, next) {
        try {
            const scheduled = await this.scheduledTransactionService.getByUserId(req.user.id);
            
            res.json(scheduled.map(item => item.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const scheduled = await this.scheduledTransactionService.getByUserAndId(req.user.id, req.params.id);
            
            res.json(scheduled.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const scheduled = await this.scheduledTransactionService.create(req.user.id, req.body);
            
            res.status(201).json(scheduled.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const scheduled = await this.scheduledTransactionService.update(req.user.id, req.params.id, req.body);
            
            res.json(scheduled.toJSON());
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await this.scheduledTransactionService.delete(req.user.id, req.params.id);
            
            res.json({ message: 'Scheduled transaction deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    async toggle(req, res, next) {
        try {
            const scheduled = await this.scheduledTransactionService.toggleActive(req.user.id, req.params.id);
            
            res.json(scheduled.toJSON());
        } catch (error) {
            next(error);
        }
    }
}
