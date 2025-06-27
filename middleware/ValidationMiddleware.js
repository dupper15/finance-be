import Joi from 'joi';
import { ValidationError } from '../core/ValidationError.js';

export class ValidationMiddleware {
    static validateRequest(schema) {
        return (req, res, next) => {
            const { error } = schema.validate(req.body);
            if (error) {
                const validationError = new ValidationError(
                    'Validation Error',
                    error.details.map(detail => detail.message)
                );
                return next(validationError);
            }
            next();
        };
    }
}

// Export the original function for compatibility
export const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(detail => detail.message)
            });
        }
        next();
    };
};

// Keep original validation schemas for compatibility
export const transactionSchema = Joi.object({
    account_id: Joi.string().uuid().required(),
    description: Joi.string().min(1).max(500).required(),
    amount: Joi.number().precision(2).positive().required(),
    transaction_date: Joi.date().iso().required(),
    transaction_type: Joi.string().valid('income', 'expense', 'transfer').required(),
    category_id: Joi.string().uuid().allow(null),
    tag_id: Joi.string().uuid().allow(null),
    memo: Joi.string().max(1000).allow('', null),
    transfer_account_id: Joi.string().uuid().when('transaction_type', {
        is: 'transfer',
        then: Joi.required(),
        otherwise: Joi.allow(null)
    })
});

export const accountSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    account_type: Joi.string().valid('checking', 'savings', 'credit_card', 'investment', 'cash', 'loan').required(),
    balance: Joi.number().precision(2).default(0)
});

export const budgetSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    amount: Joi.number().precision(2).positive().required(),
    duration: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
    account_id: Joi.string().uuid().allow(null),
    category_id: Joi.string().uuid().allow(null),
    include_subcategories: Joi.boolean().default(false),
    include_transfers: Joi.boolean().default(false),
    include_deposits: Joi.boolean().default(false),
    include_income: Joi.boolean().default(false)
});

export const profileUpdateSchema = Joi.object({
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

export const changePasswordSchema = Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(6).required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
        .messages({
            'any.only': 'Confirm password must match new password'
        })
});
