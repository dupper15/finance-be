import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, transactionSchema } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all transactions with filters
router.get('/', async (req, res) => {
    try {
        const {
            account_id,
            category_id,
            transaction_type,
            start_date,
            end_date,
            page = 1,
            limit = 50,
            search
        } = req.query;

        let query = supabase
            .from('transactions')
            .select(`
        *,
        accounts!inner(name, account_type),
        categories(name),
        tags(name)
      `)
            .eq('user_id', req.user.id);

        // Apply filters
        if (account_id) query = query.eq('account_id', account_id);
        if (category_id) query = query.eq('category_id', category_id);
        if (transaction_type) query = query.eq('transaction_type', transaction_type);
        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);
        if (search) query = query.ilike('description', `%${search}%`);

        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query
            .order('transaction_date', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            transactions: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        accounts(name, account_type),
        categories(name),
        tags(name),
        split_transactions(*)
      `)
            .eq('transaction_id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create transaction
router.post('/', validateRequest(transactionSchema), async (req, res) => {
    try {
        const transactionData = {
            ...req.body,
            user_id: req.user.id
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update transaction
router.put('/:id', validateRequest(transactionSchema), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .update(req.body)
            .eq('transaction_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .delete()
            .eq('transaction_id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transaction statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query = supabase
            .from('transactions')
            .select('amount, transaction_type')
            .eq('user_id', req.user.id);

        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);

        const { data, error } = await query;

        if (error) throw error;

        const summary = data.reduce((acc, transaction) => {
            const amount = parseFloat(transaction.amount);

            if (transaction.transaction_type === 'income') {
                acc.totalIncome += amount;
            } else if (transaction.transaction_type === 'expense') {
                acc.totalExpenses += amount;
            }

            return acc;
        }, { totalIncome: 0, totalExpenses: 0 });

        summary.netIncome = summary.totalIncome - summary.totalExpenses;

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;