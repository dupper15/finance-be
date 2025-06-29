import { UnauthorizedError } from '../core/UnauthorizedError.js';

export class AuthMiddleware {
    constructor(database, twoFactorAuthRepository = null) {
        this.db = database.getClient();
        this.twoFactorAuthRepository = twoFactorAuthRepository;
    }

    authenticateToken = async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                throw new UnauthorizedError('Access token required');
            }

            const { data: { user }, error } = await this.db.auth.getUser(token);

            if (error || !user) {
                throw new UnauthorizedError('Invalid or expired token');
            }

            req.user = user;
            next();
        } catch (error) {
            next(error);
        }
    };

    requireTwoFactor = async (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Authentication required');
            }

            if (!this.twoFactorAuthRepository) {
                return next();
            }

            const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(req.user.id);

            if (!twoFactorAuth || !twoFactorAuth.is_enabled) {
                return next();
            }

            const twoFactorToken = req.headers['x-2fa-token'];
            const skipTwoFactor = req.headers['x-skip-2fa'];

            if (skipTwoFactor === 'setup' && req.path.includes('/two-factor')) {
                return next();
            }

            if (!twoFactorToken) {
                return res.status(403).json({
                    success: false,
                    error: 'Two-factor authentication required',
                    requiresTwoFactor: true
                });
            }

            req.twoFactorAuth = twoFactorAuth;
            req.twoFactorToken = twoFactorToken;
            next();
        } catch (error) {
            next(error);
        }
    };

    optionalTwoFactor = async (req, res, next) => {
        try {
            if (!req.user || !this.twoFactorAuthRepository) {
                return next();
            }

            const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(req.user.id);
            req.twoFactorAuth = twoFactorAuth;

            next();
        } catch (error) {
            next(error);
        }
    };
}

export const authenticateToken = async (req, res, next) => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

export const createTwoFactorMiddleware = (twoFactorAuthRepository) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const twoFactorAuth = await twoFactorAuthRepository.findByUserId(req.user.id);

            if (!twoFactorAuth || !twoFactorAuth.is_enabled) {
                return next();
            }

            const twoFactorToken = req.headers['x-2fa-token'];
            const skipTwoFactor = req.headers['x-skip-2fa'];

            if (skipTwoFactor === 'setup' && req.path.includes('/two-factor')) {
                return next();
            }

            if (!twoFactorToken) {
                return res.status(403).json({
                    success: false,
                    error: 'Two-factor authentication required',
                    requiresTwoFactor: true
                });
            }

            req.twoFactorAuth = twoFactorAuth;
            req.twoFactorToken = twoFactorToken;
            next();
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};