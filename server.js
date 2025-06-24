import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Import routes
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import budgetRoutes from './routes/budgets.js';
import scheduledTransactionRoutes from './routes/scheduledTransactions.js';
import reportRoutes from './routes/reports.js';
import importExportRoutes from './routes/importExport.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Import services
import { processScheduledTransactions } from './services/scheduledTransactionService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/scheduled-transactions', scheduledTransactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/import-export', importExportRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Schedule cron job to process scheduled transactions (runs every hour)
cron.schedule('0 * * * *', async () => {
    console.log('Processing scheduled transactions...');
    try {
        await processScheduledTransactions();
        console.log('Scheduled transactions processed successfully');
    } catch (error) {
        console.error('Error processing scheduled transactions:', error);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

