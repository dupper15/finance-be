import { supabase } from '../config/database.js';

export const getDashboardData = async (userId) => {
    try {
        // Get account balances
        const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('account_id, name, account_type, balance')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (accountsError) throw accountsError;

        // Get recent transactions
        const { data: recentTransactions, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
        transaction_id,
        description,
        amount,
        transaction_date,
        transaction_type,
        accounts(name),
        categories(name, color)
      `)
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(10);

        if (transactionsError) throw transactionsError;

        // Get monthly summary (current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthlyTransactions, error: monthlyError } = await supabase
            .from('transactions')
            .select('amount, transaction_type')
            .eq('user_id', userId)
            .gte('transaction_date', startOfMonth.toISOString());

        if (monthlyError) throw monthlyError;

        const monthlySummary = monthlyTransactions.reduce((acc, transaction) => {
            const amount = parseFloat(transaction.amount);
            if (transaction.transaction_type === 'income') {
                acc.income += amount;
            } else if (transaction.transaction_type === 'expense') {
                acc.expenses += amount;
            }
            return acc;
        }, { income: 0, expenses: 0 });

        monthlySummary.net = monthlySummary.income - monthlySummary.expenses;

        // Get upcoming scheduled transactions
        const { data: upcomingTransactions, error: upcomingError } = await supabase
            .from('scheduled_transactions')
            .select(`
        scheduled_id,
        description,
        amount,
        next_due_date,
        transaction_type,
        accounts(name)
      `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .gte('next_due_date', new Date().toISOString())
            .order('next_due_date', { ascending: true })
            .limit(5);

        if (upcomingError) throw upcomingError;

        // Get budget alerts
        const { data: budgets, error: budgetsError } = await supabase
            .from('budgets')
            .select('budget_id, name, amount, start_date, end_date, category_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString());

        if (budgetsError) throw budgetsError;

        const budgetAlerts = [];
        for (const budget of budgets) {
            const spent = await calculateCategoryTotal(
                budget.category_id,
                budget.start_date,
                budget.end_date,
                userId
            );

            const percentage = (spent / parseFloat(budget.amount)) * 100;

            if (percentage >= 80) {
                budgetAlerts.push({
                    budget_id: budget.budget_id,
                    name: budget.name,
                    spent,
                    amount: parseFloat(budget.amount),
                    percentage,
                    status: percentage >= 100 ? 'exceeded' : 'warning'
                });
            }
        }

        return {
            accounts,
            totalBalance: accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0),
            recentTransactions,
            monthlySummary,
            upcomingTransactions,
            budgetAlerts
        };

    } catch (error) {
        throw new Error(`Dashboard data error: ${error.message}`);
    }
};