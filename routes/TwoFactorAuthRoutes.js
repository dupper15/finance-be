import express from 'express';
import { authenticateToken } from '../middleware/AuthMiddleware.js';
import { validateRequest } from '../middleware/ValidationMiddleware.js';
import Joi from 'joi';

export class TwoFactorAuthRoutes {
    constructor(container) {
        this.router = express.Router();
        this.controller = container.get('twoFactorAuthController');
        this.setupValidationSchemas();
        this.setupRoutes();
    }

    setupValidationSchemas() {
        this.verifyTokenSchema = Joi.object({
            token: Joi.string().pattern(/^\d{6}$/).required().messages({
                'string.pattern.base': 'Token must be exactly 6 digits',
                'any.required': 'Token is required'
            })
        });

        this.verifyLoginSchema = Joi.object({
            token: Joi.string().min(6).max(8).required().messages({
                'string.min': 'Token must be at least 6 characters',
                'string.max': 'Token must be at most 8 characters',
                'any.required': 'Token is required'
            })
        });

        this.passwordConfirmationSchema = Joi.object({
            password: Joi.string().min(1).required().messages({
                'string.min': 'Password is required',
                'any.required': 'Password is required'
            })
        });
    }

    setupRoutes() {
        this.router.use(authenticateToken);

        this.router.get('/status', this.controller.getStatus.bind(this.controller));

        this.router.post('/setup', this.controller.setup.bind(this.controller));

        this.router.post('/verify',
            validateRequest(this.verifyTokenSchema),
            this.controller.verify.bind(this.controller)
        );

        this.router.post('/verify-login',
            validateRequest(this.verifyLoginSchema),
            this.controller.verifyLogin.bind(this.controller)
        );

        this.router.post('/disable',
            validateRequest(this.passwordConfirmationSchema),
            this.controller.disable.bind(this.controller)
        );

        this.router.post('/regenerate-backup-codes',
            validateRequest(this.passwordConfirmationSchema),
            this.controller.regenerateBackupCodes.bind(this.controller)
        );
    }

    getRouter() {
        return this.router;
    }
}