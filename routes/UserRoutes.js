import express from 'express';
import {authenticateToken, createTwoFactorMiddleware} from '../middleware/AuthMiddleware.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import Joi from 'joi';

export class UserRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('userController');
        this.twoFactorAuthRepository = container.get('twoFactorAuthRepository');
        this.setupValidationSchemas();
        this.setupRoutes();
    }

    setupValidationSchemas() {
        this.profileUpdateSchema = Joi.object({
            name: Joi.string().min(1).max(255).required(),
            phone: Joi.string().pattern(/^[+]?[\d\s\-()]+$/).allow('', null),
            preferences: Joi.object({
                currency: Joi.string().valid('VND', 'USD', 'EUR').default('VND'),
                language: Joi.string().valid('vi', 'en').default('vi'),
                timezone: Joi.string().default('Asia/Ho_Chi_Minh'),
                notifications: Joi.object({
                    email: Joi.boolean().default(true),
                    budget_alerts: Joi.boolean().default(true),
                    transaction_reminders: Joi.boolean().default(true)
                }).default({})
            }).default({})
        });

        this.changePasswordSchema = Joi.object({
            current_password: Joi.string().required(),
            new_password: Joi.string().min(6).required(),
            confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
        });
    }

    setupRoutes() {
        // Apply authentication to all user routes
        this.router.use(authenticateToken);

        // Get user profile
        this.router.get('/me', this.controller.getProfile.bind(this.controller));

        // Update user profile
        this.router.put('/profile',
            ValidationMiddleware.validateRequest(this.profileUpdateSchema),
            this.controller.updateProfile.bind(this.controller)
        );

        // Change password

        this.router.post('/change-password',
            createTwoFactorMiddleware(this.twoFactorAuthRepository),
            ValidationMiddleware.validateRequest(this.changePasswordSchema),
            this.controller.changePassword.bind(this.controller)
        );

        // Get user statistics
        this.router.get('/stats', this.controller.getUserStats.bind(this.controller));

        // Get account summary (profile + stats combined)
        this.router.get('/summary', this.controller.getAccountSummary.bind(this.controller));

        // Delete user account
        this.router.delete('/account', this.controller.deleteAccount.bind(this.controller));
    }

    getRouter() {
        return this.router;
    }
}