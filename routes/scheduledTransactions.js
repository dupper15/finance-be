import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();
router.use(authenticateToken);

// Validation schema for scheduled transactions
const scheduledTransactionSchema = Joi.object({
    account_id: Joi.string().uuid().required(),
    description: Joi.string().min(1).max(500).required(),
    amount: Joi.number().precision(2).positive().required(),
    next_due_date: Joi.date().iso().required(),
    schedule_type: Joi.string().valid('once', 'recurring', 'installment').required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').when('schedule_type', {
        not: 'once',
        then: Joi.required(),
        otherwise: Joi.allow(null)
    }),
    num_installments: Joi.number().integer().positive().when('schedule_type', {
        is: 'installment',
        then: Joi.required(),
        otherwise: Joi.allow(null)
    }),
    transaction_type: Joi.string().valid('income', 'expense', 'transfer').required(),
    category_id: Joi.string().uuid().allow(null),
    transfer_account_id: Joi.string().uuid().when('transaction_type', {
        is: 'transfer',
        then: Joi.required(),
        otherwise: Joi.allow(null)
    }),
    end_date: Joi.date().iso().allow(null)
});

// Get all scheduled transactions
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('scheduled_transactions')
            .select(`
        *,
        accounts!scheduled_transactions_account_id_fkey(name, account_type),
        categories(name),
        transfer_accounts:accounts!scheduled_transactions_transfer_account_id_fkey(name, account_type)
      `)
            .eq('user_id', req.user.id)
            .order('next_due_date', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create scheduled transaction
router.post('/', validateRequest(scheduledTransactionSchema), async (req, res) => {
    try {
        const scheduledData = {
            ...req.body,
            user_id: req.user.id,
            remaining_installments: req.body.schedule_type === 'installment' ? req.body.num_installments : null
        };

        const { data, error } = await supabase
            .from('scheduled_transactions')
            .insert([scheduledData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update scheduled transaction
router.put('/:id', validateRequest(scheduledTransactionSchema), async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            remaining_installments: req.body.schedule_type === 'installment' ? req.body.num_installments : null
        };

        const { data, error } = await supabase
            .from('scheduled_transactions')
            .update(updateData)
            .eq('scheduled_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Scheduled transaction not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete scheduled transaction
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('scheduled_transactions')
            .delete()
            .eq('scheduled_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Scheduled transaction not found' });
        }

        res.json({ message: 'Scheduled transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle scheduled transaction active status
router.patch('/:id/toggle', async (req, res) => {
    try {
        // First get current status
        const { data: current, error: fetchError } = await supabase
            .from('scheduled_transactions')
            .select('is_active')
            .eq('scheduled_id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError) throw fetchError;

        if (!current) {
            return res.status(404).json({ error: 'Scheduled transaction not found' });
        }

        // Toggle the status
        const { data, error } = await supabase
            .from('scheduled_transactions')
            .update({ is_active: !current.is_active })
            .eq('scheduled_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
