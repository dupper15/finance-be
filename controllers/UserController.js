export class UserController {
    constructor(userService) {
        this.userService = userService;
    }

    async getProfile(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authorization token required'
                });
            }

            const user = await this.userService.getProfile(token);

            res.json({
                success: true,
                user: user.toJSON()
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authorization token required'
                });
            }

            const user = await this.userService.updateProfile(token, req.body);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: user.toJSON()
            });
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req, res, next) {
        try {
            const { current_password, new_password } = req.body;
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authorization token required'
                });
            }

            if (!current_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password and new password are required'
                });
            }

            const result = await this.userService.changePassword(token, current_password, new_password);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserStats(req, res, next) {
        try {
            const userId = req.user.id;
            const stats = await this.userService.getUserStats(userId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteAccount(req, res, next) {
        try {
            const userId = req.user.id;
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authorization token required'
                });
            }

            const result = await this.userService.deleteAccount(userId, token);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }

    async getAccountSummary(req, res, next) {
        try {
            const userId = req.user.id;
            const summary = await this.userService.getAccountSummary(userId);

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    }
}