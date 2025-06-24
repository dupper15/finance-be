import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, budgetSchema } from '../middleware/validation.js';

const router = express.Router();
router.use(authenticateToken);

// Get all budgets
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        accounts(name),
        categories(name)
      `)
            .eq('user_id', req.user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create budget
router.post('/', validateRequest(budgetSchema), async (req, res) => {
    try {
        const budgetData = {
            ...req.body,
            user_id: req.user.id
        };

        const { data, error } = await supabase
            .from('budgets')
            .insert([budgetData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get budget progress
router.get('/:id/progress', async (req, res) => {
    try {
        // Get budget details
        const { data: budget, error: budgetError } = await supabase
            .from('budgets')
            .select('*')
            .eq('budget_id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (budgetError) throw budgetError;

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        // Calculate spent amount based on budget criteria
        let query = supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', req.user.id)
            .gte('transaction_date', budget.start_date)
            .lte('transaction_date', budget.end_date);

        if (budget.account_id) {
            query = query.eq('account_id', budget.account_id);
        }

        if (budget.category_id) {
            query = query.eq('category_id', budget.category_id);
        }

        if (!budget.include_income) {
            query = query.neq('transaction_type', 'income');
        }

        if (!budget.include_transfers) {
            query = query.neq('transaction_type', 'transfer');
        }

        const { data: transactions, error: transactionError } = await query;

        if (transactionError) throw transactionError;

        const spent = transactions.reduce((total, transaction) => {
            return total + parseFloat(transaction.amount);
        }, 0);

        const remaining = parseFloat(budget.amount) - spent;
        const percentage = (spent / parseFloat(budget.amount)) * 100;

        res.json({
            budget,
            spent,
            remaining,
            percentage: Math.min(percentage, 100),
            isOverBudget: spent > parseFloat(budget.amount)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;