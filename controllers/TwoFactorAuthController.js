export class TwoFactorAuthController {
    constructor(twoFactorAuthService, userService) {
        this.twoFactorAuthService = twoFactorAuthService;
        this.userService = userService;
    }

    async setup(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await this.twoFactorAuthService.setup(userId);

            res.json({
                success: true,
                message: 'Two-factor authentication setup initialized',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async verify(req, res, next) {
        try {
            const { token } = req.body;
            const userId = req.user.id;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Two-factor authentication token is required'
                });
            }

            if (!/^[A-Z0-9]{6,8}$/.test(token.toUpperCase()) && !/^\d{6}$/.test(token)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid token format'
                });
            }

            const result = await this.twoFactorAuthService.verify(userId, token);

            res.json({
                success: true,
                message: 'Two-factor authentication enabled successfully',
                data: result.toJSON()
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyLogin(req, res, next) {
        try {
            const { token } = req.body;
            const userId = req.user.id;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Two-factor authentication token is required'
                });
            }

            if (!/^[A-Z0-9]{6,8}$/.test(token.toUpperCase()) && !/^\d{6}$/.test(token)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid token format'
                });
            }

            const result = await this.twoFactorAuthService.verifyToken(
                userId,
                token,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: 'Two-factor authentication verified',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getStatus(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await this.twoFactorAuthService.getStatus(userId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async disable(req, res, next) {
        try {
            const { password } = req.body;
            const userId = req.user.id;
            const token = req.headers.authorization?.split(' ')[1];

            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: 'Password confirmation is required'
                });
            }

            try {
                const user = await this.userService.getProfile(token);
                await this.userService.verifyPassword(user.email, password);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid password'
                });
            }

            const result = await this.twoFactorAuthService.disable(userId);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }

    async regenerateBackupCodes(req, res, next) {
        try {
            const { password } = req.body;
            const userId = req.user.id;
            const token = req.headers.authorization?.split(' ')[1];

            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: 'Password confirmation is required'
                });
            }

            try {
                const user = await this.userService.getProfile(token);
                await this.userService.verifyPassword(user.email, password);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid password'
                });
            }

            const result = await this.twoFactorAuthService.regenerateBackupCodes(userId);

            res.json({
                success: true,
                message: 'Backup codes regenerated successfully',
                data: {
                    backupCodes: result.backupCodes
                }
            });
        } catch (error) {
            next(error);
        }
    }
}