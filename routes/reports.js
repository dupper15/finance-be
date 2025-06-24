import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get income vs expense report
router.get('/income-expense', async (req, res) => {
    try {
        const { start_date, end_date, group_by = 'month' } = req.query;

        let query = supabase
            .from('transactions')
            .select('transaction_date, amount, transaction_type')
            .eq('user_id', req.user.id)
            .in('transaction_type', ['income', 'expense']);

        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);

        const { data, error } = await query.order('transaction_date');

        if (error) throw error;

        // Group data by specified period
        const groupedData = {};

        data.forEach(transaction => {
            const date = new Date(transaction.transaction_date);
            let key;

            switch (group_by) {
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
                    key = startOfWeek.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'year':
                    key = date.getFullYear().toString();
                    break;
                default:
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!groupedData[key]) {
                groupedData[key] = { income: 0, expense: 0, period: key };
            }

            const amount = parseFloat(transaction.amount);
            if (transaction.transaction_type === 'income') {
                groupedData[key].income += amount;
            } else {
                groupedData[key].expense += amount;
            }
        });

        const result = Object.values(groupedData).map(item => ({
            ...item,
            net: item.income - item.expense
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get expense breakdown by category
router.get('/expense-by-category', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query = supabase
            .from('transactions')
            .select(`
        amount,
        categories(name, color)
      `)
            .eq('user_id', req.user.id)
            .eq('transaction_type', 'expense');

        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);

        const { data, error } = await query;

        if (error) throw error;

        const categoryTotals = {};

        data.forEach(transaction => {
            const categoryName = transaction.categories?.name || 'Uncategorized';
            const amount = parseFloat(transaction.amount);

            if (!categoryTotals[categoryName]) {
                categoryTotals[categoryName] = {
                    category: categoryName,
                    total: 0,
                    color: transaction.categories?.color || '#999999'
                };
            }

            categoryTotals[categoryName].total += amount;
        });

        const result = Object.values(categoryTotals)
            .sort((a, b) => b.total - a.total);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get account balances summary
router.get('/account-balances', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .select('name, account_type, balance')
            .eq('user_id', req.user.id)
            .eq('is_active', true);

        if (error) throw error;

        const summary = {
            accounts: data,
            totalBalance: data.reduce((sum, account) => sum + parseFloat(account.balance), 0),
            byType: {}
        };

        // Group by account type
        data.forEach(account => {
            const type = account.account_type;
            if (!summary.byType[type]) {
                summary.byType[type] = {
                    count: 0,
                    totalBalance: 0
                };
            }
            summary.byType[type].count++;
            summary.byType[type].totalBalance += parseFloat(account.balance);
        });

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly trends
router.get('/monthly-trends', async (req, res) => {
    try {
        const { months = 12 } = req.query;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const { data, error } = await supabase
            .from('transactions')
            .select('transaction_date, amount, transaction_type')
            .eq('user_id', req.user.id)
            .gte('transaction_date', startDate.toISOString())
            .order('transaction_date');

        if (error) throw error;

        const monthlyData = {};

        data.forEach(transaction => {
            const date = new Date(transaction.transaction_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    income: 0,
                    expense: 0,
                    transactions: 0
                };
            }

            const amount = parseFloat(transaction.amount);
            monthlyData[monthKey].transactions++;

            if (transaction.transaction_type === 'income') {
                monthlyData[monthKey].income += amount;
            } else if (transaction.transaction_type === 'expense') {
                monthlyData[monthKey].expense += amount;
            }
        });

        const result = Object.values(monthlyData).map(month => ({
            ...month,
            net: month.income - month.expense,
            savingsRate: month.income > 0 ? ((month.income - month.expense) / month.income) * 100 : 0
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get budget performance report
router.get('/budget-performance', async (req, res) => {
    try {
        const { data: budgets, error } = await supabase
            .from('budgets')
            .select(`
        *,
        categories(name)
      `)
            .eq('user_id', req.user.id)
            .eq('is_active', true);

        if (error) throw error;

        const budgetPerformance = [];

        for (const budget of budgets) {
            // Calculate spent amount for each budget
            let query = supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', req.user.id)
                .gte('transaction_date', budget.start_date)
                .lte('transaction_date', budget.end_date);

            if (budget.account_id) query = query.eq('account_id', budget.account_id);
            if (budget.category_id) query = query.eq('category_id', budget.category_id);
            if (!budget.include_income) query = query.neq('transaction_type', 'income');
            if (!budget.include_transfers) query = query.neq('transaction_type', 'transfer');

            const { data: transactions } = await query;

            const spent = transactions?.reduce((total, t) => total + parseFloat(t.amount), 0) || 0;
            const budgetAmount = parseFloat(budget.amount);
            const remaining = budgetAmount - spent;
            const percentage = (spent / budgetAmount) * 100;

            budgetPerformance.push({
                budget_id: budget.budget_id,
                name: budget.name,
                category: budget.categories?.name,
                amount: budgetAmount,
                spent,
                remaining,
                percentage,
                status: percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'good',
                period: `${budget.start_date} to ${budget.end_date}`
            });
        }

        res.json(budgetPerformance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;