
export class DashboardService {
    constructor(
        accountService,
        transactionService,
        budgetService,
        scheduledTransactionService
    ) {
        this.accountService = accountService;
        this.transactionService = transactionService;
        this.budgetService = budgetService;
        this.scheduledTransactionService = scheduledTransactionService;
    }

    async getDashboardData(userId) {
        try {
            // Get account balances
            const accounts = await this.accountService.getByUserId(userId);
            const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

            // Get recent transactions
            const recentTransactions = await this.transactionService.getRecentTransactions(userId, 10);

            // Get monthly summary (current month)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const monthlySummary = await this.transactionService.getStatsSummary(
                userId,
                startOfMonth.toISOString(),
                new Date().toISOString()
            );

            // Get upcoming scheduled transactions
            const upcomingTransactions = await this.scheduledTransactionService.getUpcoming(userId, 5);

            // Get budget alerts
            const budgetAlerts = await this.budgetService.getBudgetAlerts(userId);

            return {
                accounts: accounts.map(acc => acc.toJSON()),
                totalBalance,
                recentTransactions: recentTransactions.map(tx => tx.toJSON()),
                monthlySummary,
                upcomingTransactions,
                budgetAlerts
            };

        } catch (error) {
            throw new Error(`Dashboard data error: ${error.message}`);
        }
    }
}
