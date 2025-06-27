export class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }

    async getDashboard(req, res, next) {
        try {
            const dashboardData = await this.dashboardService.getDashboardData(req.user.id);
            
            res.json({
                success: true,
                data: dashboardData,
                message: 'Dashboard data retrieved successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}
