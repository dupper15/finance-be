export class ReportController {
    constructor(reportService) {
        this.reportService = reportService;
    }

    async getIncomeExpenseReport(req, res, next) {
        try {
            const { start_date, end_date, group_by = 'month' } = req.query;
            const report = await this.reportService.getIncomeExpenseReport(
                req.user.id, 
                start_date, 
                end_date, 
                group_by
            );
            
            res.json(report);
        } catch (error) {
            next(error);
        }
    }

    async getExpenseByCategoryReport(req, res, next) {
        try {
            const { start_date, end_date } = req.query;
            const report = await this.reportService.getExpenseByCategoryReport(
                req.user.id, 
                start_date, 
                end_date
            );
            
            res.json(report);
        } catch (error) {
            next(error);
        }
    }

    async getAccountBalancesReport(req, res, next) {
        try {
            const report = await this.reportService.getAccountBalancesReport(req.user.id);
            
            res.json(report);
        } catch (error) {
            next(error);
        }
    }

    async getMonthlyTrendsReport(req, res, next) {
        try {
            const { months = 12 } = req.query;
            const report = await this.reportService.getMonthlyTrendsReport(req.user.id, parseInt(months));
            
            res.json(report);
        } catch (error) {
            next(error);
        }
    }

    async getBudgetPerformanceReport(req, res, next) {
        try {
            const report = await this.reportService.getBudgetPerformanceReport(req.user.id);
            
            res.json(report);
        } catch (error) {
            next(error);
        }
    }
}
