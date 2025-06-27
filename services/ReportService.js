export class ReportService {
    constructor(transactionRepository, budgetRepository, accountService) {
        this.transactionRepository = transactionRepository;
        this.budgetRepository = budgetRepository;
        this.accountService = accountService;
    }

    async getIncomeExpenseReport(userId, startDate = null, endDate = null, groupBy = 'month') {
        const filters = {
            start_date: startDate,
            end_date: endDate
        };

        const result = await this.transactionRepository.findByUserId(userId, filters);
        const transactions = result.data.filter(t => ['income', 'expense'].includes(t.transaction_type));

        // Group data by specified period
        const groupedData = {};

        transactions.forEach(transaction => {
            const date = new Date(transaction.transaction_date);
            let key;

            switch (groupBy) {
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

        return Object.values(groupedData).map(item => ({
            ...item,
            net: item.income - item.expense
        }));
    }

    async getExpenseByCategoryReport(userId, startDate = null, endDate = null) {
        const filters = {
            start_date: startDate,
            end_date: endDate
        };

        const result = await this.transactionRepository.findByUserId(userId, filters);
        const expenses = result.data.filter(t => t.transaction_type === 'expense');

        const categoryTotals = {};

        expenses.forEach(transaction => {
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

        return Object.values(categoryTotals)
            .sort((a, b) => b.total - a.total);
    }

    async getAccountBalancesReport(userId) {
        const accounts = await this.accountService.getByUserId(userId);
        const balanceByType = await this.accountService.getBalanceByType(userId);
        const totalBalance = await this.accountService.getTotalBalance(userId);

        return {
            accounts: accounts.map(acc => acc.toJSON()),
            totalBalance,
            byType: balanceByType
        };
    }

    async getMonthlyTrendsReport(userId, months = 12) {
        return await this.transactionService.getMonthlyTrends(userId, months);
    }

    async getBudgetPerformanceReport(userId) {
        const budgets = await this.budgetRepository.findByUserId(userId);
        const budgetPerformance = [];

        for (const budgetData of budgets) {
            const budgetCriteria = {
                start_date: budgetData.start_date,
                end_date: budgetData.end_date,
                account_id: budgetData.account_id,
                category_id: budgetData.category_id,
                include_income: budgetData.include_income,
                include_transfers: budgetData.include_transfers
            };

            const transactions = await this.transactionRepository.findForBudgetCalculation(userId, budgetCriteria);
            const spent = transactions?.reduce((total, t) => total + parseFloat(t.amount), 0) || 0;
            const budgetAmount = parseFloat(budgetData.amount);
            const remaining = budgetAmount - spent;
            const percentage = (spent / budgetAmount) * 100;

            budgetPerformance.push({
                budget_id: budgetData.budget_id,
                name: budgetData.name,
                category: budgetData.categories?.name,
                amount: budgetAmount,
                spent,
                remaining,
                percentage,
                status: percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'good',
                period: `${budgetData.start_date} to ${budgetData.end_date}`
            });
        }

        return budgetPerformance;
    }
}
