import { UnauthorizedError } from '../core/UnauthorizedError.js';

export class AuthMiddleware {
    constructor(database) {
        this.db = database.getClient();
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
}

// Export the original function for compatibility
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
