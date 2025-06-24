import Joi from 'joi';

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

// Transaction validation schema
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

// Account validation schema
export const accountSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    account_type: Joi.string().valid('checking', 'savings', 'credit_card', 'investment', 'cash', 'loan').required(),
    balance: Joi.number().precision(2).default(0)
});

// Budget validation schema
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