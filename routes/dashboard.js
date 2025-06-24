import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDashboardData } from '../services/dashboardService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

const router = express.Router();
router.use(authenticateToken);

// Get dashboard overview
router.get('/', async (req, res) => {
    try {
        const dashboardData = await getDashboardData(req.user.id);
        successResponse(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (error) {
        errorResponse(res, error.message, 500);
    }
});

export default router;