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
            const [
                accounts,
                recentTransactions,
                upcomingTransactions,
                budgetAlerts,
                monthlySummary
            ] = await Promise.allSettled([
                this.getAccountData(userId),
                this.getRecentTransactions(userId),
                this.getUpcomingTransactions(userId),
                this.getBudgetAlerts(userId),
                this.getMonthlySummary(userId)
            ]);

            const accountData = accounts.status === 'fulfilled' ? accounts.value : { accounts: [], totalBalance: 0 };
            const recentTx = recentTransactions.status === 'fulfilled' ? recentTransactions.value : [];
            const upcomingTx = upcomingTransactions.status === 'fulfilled' ? upcomingTransactions.value : [];
            const budgetData = budgetAlerts.status === 'fulfilled' ? budgetAlerts.value : [];
            const monthlyData = monthlySummary.status === 'fulfilled' ? monthlySummary.value : { income: 0, expenses: 0, balance: 0 };

            return {
                accounts: accountData.accounts,
                totalBalance: accountData.totalBalance,
                recentTransactions: recentTx,
                monthlySummary: monthlyData,
                upcomingTransactions: upcomingTx,
                budgetAlerts: budgetData
            };

        } catch (error) {
            console.error('Dashboard service error:', error);
            throw new Error(`Dashboard data error: ${error.message}`);
        }
    }

    async getAccountData(userId) {
        try {
            const accounts = await this.accountService.getByUserId(userId);
            const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

            return {
                accounts: accounts.map(acc => acc.toJSON()),
                totalBalance
            };
        } catch (error) {
            console.error('Error fetching account data:', error);
            return { accounts: [], totalBalance: 0 };
        }
    }

    async getRecentTransactions(userId) {
        try {
            const recentTransactions = await this.transactionService.getRecentTransactions(userId, 10);
            return recentTransactions.map(tx => tx.toJSON());
        } catch (error) {
            console.error('Error fetching recent transactions:', error);
            return [];
        }
    }

    async getUpcomingTransactions(userId) {
        try {
            return await this.scheduledTransactionService.getUpcoming(userId, 7);
        } catch (error) {
            console.error('Error fetching upcoming transactions:', error);
            return [];
        }
    }

    async getBudgetAlerts(userId) {
        try {
            return await this.budgetService.getBudgetAlerts(userId);
        } catch (error) {
            console.error('Error fetching budget alerts:', error);
            return [];
        }
    }

    async getMonthlySummary(userId) {
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const endOfMonth = new Date();
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            endOfMonth.setDate(0);
            endOfMonth.setHours(23, 59, 59, 999);

            return await this.transactionService.getStatsSummary(
                userId,
                startOfMonth.toISOString(),
                endOfMonth.toISOString()
            );
        } catch (error) {
            console.error('Error fetching monthly summary:', error);
            return { income: 0, expenses: 0, balance: 0 };
        }
    }
}