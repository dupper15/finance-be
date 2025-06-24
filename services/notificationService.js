import { supabase } from '../config/database.js';

export const checkBudgetAlerts = async (userId) => {
    try {
        const { data: budgets, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString());

        if (error) throw error;

        const alerts = [];

        for (const budget of budgets) {
            const spent = await calculateCategoryTotal(
                budget.category_id,
                budget.start_date,
                budget.end_date,
                userId,
                budget.include_subcategories
            );

            const percentage = (spent / parseFloat(budget.amount)) * 100;

            if (percentage >= 80) {
                alerts.push({
                    type: 'budget_alert',
                    budget_id: budget.budget_id,
                    budget_name: budget.name,
                    spent,
                    amount: parseFloat(budget.amount),
                    percentage,
                    severity: percentage >= 100 ? 'high' : 'medium',
                    message: percentage >= 100
                        ? `Budget "${budget.name}" has been exceeded by ${percentage - 100}%`
                        : `Budget "${budget.name}" is ${percentage}% utilized`
                });
            }
        }

        return alerts;
    } catch (error) {
        console.error('Error checking budget alerts:', error);
        return [];
    }
};

export const checkUpcomingTransactions = async (userId, daysAhead = 7) => {
    try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const { data: upcoming, error } = await supabase
            .from('scheduled_transactions')
            .select(`
        *,
        accounts(name)
      `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .gte('next_due_date', new Date().toISOString())
            .lte('next_due_date', futureDate.toISOString())
            .order('next_due_date');

        if (error) throw error;

        return upcoming.map(transaction => ({
            type: 'upcoming_transaction',
            scheduled_id: transaction.scheduled_id,
            description: transaction.description,
            amount: parseFloat(transaction.amount),
            due_date: transaction.next_due_date,
            account_name: transaction.accounts.name,
            transaction_type: transaction.transaction_type,
            days_until_due: Math.ceil(
                (new Date(transaction.next_due_date) - new Date()) / (1000 * 60 * 60 * 24)
            )
        }));
    } catch (error) {
        console.error('Error checking upcoming transactions:', error);
        return [];
    }
};