import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, accountSchema } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all accounts
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get account by ID
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('account_id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create account
router.post('/', validateRequest(accountSchema), async (req, res) => {
    try {
        const accountData = {
            ...req.body,
            user_id: req.user.id
        };

        const { data, error } = await supabase
            .from('accounts')
            .insert([accountData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update account
router.put('/:id', validateRequest(accountSchema), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .update(req.body)
            .eq('account_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete account (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .update({ is_active: false })
            .eq('account_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get account balance history
router.get('/:id/balance-history', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const { data, error } = await supabase
            .from('transactions')
            .select('transaction_date, amount, transaction_type')
            .eq('account_id', req.params.id)
            .eq('user_id', req.user.id)
            .gte('transaction_date', startDate.toISOString())
            .order('transaction_date', { ascending: true });

        if (error) throw error;

        // Calculate running balance
        let runningBalance = 0;
        const balanceHistory = data.map(transaction => {
            if (transaction.transaction_type === 'income') {
                runningBalance += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === 'expense') {
                runningBalance -= parseFloat(transaction.amount);
            }

            return {
                date: transaction.transaction_date,
                balance: runningBalance
            };
        });

        res.json(balanceHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;