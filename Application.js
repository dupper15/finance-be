import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';

import { Container } from './container/Container.js';
import { ServiceProvider } from './container/ServiceProvider.js';
import { ErrorMiddleware } from './middleware/ErrorMiddleware.js';

// Route classes
import { AuthRoutes } from './routes/AuthRoutes.js';
import { UserRoutes } from './routes/UserRoutes.js';
import { TwoFactorAuthRoutes } from './routes/TwoFactorAuthRoutes.js';
import { AccountRoutes } from './routes/AccountRoutes.js';
import { TransactionRoutes } from './routes/TransactionRoutes.js';
import { BudgetRoutes } from './routes/BudgetRoutes.js';
import { CategoryRoutes } from './routes/CategoryRoutes.js';
import { TagRoutes } from './routes/TagRoutes.js';
import { ScheduledTransactionRoutes } from './routes/ScheduledTransactionRoutes.js';
import { DashboardRoutes } from './routes/DashboardRoutes.js';
import { ReportRoutes } from './routes/ReportRoutes.js';
import { ImportExportRoutes } from "./routes/ImportExportRoutes.js";

export class Application {
    constructor() {
        dotenv.config();
        this.app = express();
        this.container = new Container();
        this.setupContainer();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.setupCronJobs();
    }

    setupContainer() {
        ServiceProvider.register(this.container);
    }

    setupMiddleware() {
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10000, // limit each IP to 10000 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
        });

        this.app.use(helmet());
        this.app.use(cors({
            origin: true, // Allow all origins in development
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'X-2FA-Token']
        }));
        this.app.use(compression());
        this.app.use(morgan('combined'));
        this.app.use(limiter);
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // API Routes using OOP approach
        const authRoutes = new AuthRoutes(this.container);
        const userRoutes = new UserRoutes(this.container);
        const twoFactorAuthRoutes = new TwoFactorAuthRoutes(this.container);
        const accountRoutes = new AccountRoutes(this.container);
        const transactionRoutes = new TransactionRoutes(this.container);
        const budgetRoutes = new BudgetRoutes(this.container);
        const categoryRoutes = new CategoryRoutes(this.container);
        const tagRoutes = new TagRoutes(this.container);
        const scheduledTransactionRoutes = new ScheduledTransactionRoutes(this.container);
        const dashboardRoutes = new DashboardRoutes(this.container);
        const reportRoutes = new ReportRoutes(this.container);
        const importExportRoutes = new ImportExportRoutes(this.container);

        this.app.use('/api/auth', authRoutes.getRouter());
        this.app.use('/api/user', userRoutes.getRouter());
        this.app.use('/api/two-factor', twoFactorAuthRoutes.getRouter());
        this.app.use('/api/accounts', accountRoutes.getRouter());
        this.app.use('/api/transactions', transactionRoutes.getRouter());
        this.app.use('/api/budgets', budgetRoutes.getRouter());
        this.app.use('/api/categories', categoryRoutes.getRouter());
        this.app.use('/api/tags', tagRoutes.getRouter());
        this.app.use('/api/scheduled-transactions', scheduledTransactionRoutes.getRouter());
        this.app.use('/api/dashboard', dashboardRoutes.getRouter());
        this.app.use('/api/reports', reportRoutes.getRouter());
        this.app.use('/api/import-export', importExportRoutes.getRouter());
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use(ErrorMiddleware.notFound);

        // Global error handler
        this.app.use(ErrorMiddleware.handle);
    }

    setupCronJobs() {
        // Schedule cron job to process scheduled transactions (runs every hour)
        cron.schedule('0 * * * *', async () => {
            console.log('Processing scheduled transactions...');
            try {
                const scheduledTransactionService = this.container.get('scheduledTransactionService');
                const result = await scheduledTransactionService.processDueTransactions();
                console.log(`Scheduled transactions processed successfully: ${result.processed} transactions`);
            } catch (error) {
                console.error('Error processing scheduled transactions:', error);
            }
        });
    }

    start(port = process.env.PORT || 3000) {
        this.app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Two-Factor Authentication: Enabled`);
        });
    }

    getApp() {
        return this.app;
    }

    getContainer() {
        return this.container;
    }
}