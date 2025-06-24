import fs from 'fs';
import path from 'path';

const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

export const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.id || 'anonymous'
    };

    // Log to file
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    next();
};

export const errorLogger = (error, req, res, next) => {
    const timestamp = new Date().toISOString();
    const errorEntry = {
        timestamp,
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.originalUrl,
        user: req.user?.id || 'anonymous'
    };

    // Log error to file
    const errorFile = path.join(logsDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(errorFile, JSON.stringify(errorEntry) + '\n');

    next(error);
};