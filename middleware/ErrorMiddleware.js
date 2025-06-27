import { ValidationError } from '../core/ValidationError.js';
import { NotFoundError } from '../core/NotFoundError.js';
import { UnauthorizedError } from '../core/UnauthorizedError.js';

export class ErrorMiddleware {
    static handle(err, req, res, next) {
        console.error(err.stack);

        if (err instanceof ValidationError) {
            return res.status(err.status).json({
                success: false,
                error: err.message,
                details: err.errors
            });
        }

        if (err instanceof NotFoundError) {
            return res.status(err.status).json({
                success: false,
                error: err.message
            });
        }

        if (err instanceof UnauthorizedError) {
            return res.status(err.status).json({
                success: false,
                error: err.message
            });
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                details: err.details
            });
        }

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'File too large',
                message: 'File size exceeds the limit'
            });
        }

        res.status(err.status || 500).json({
            success: false,
            error: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    static notFound(req, res) {
        res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            message: `Route ${req.originalUrl} not found`
        });
    }
}
