import { BaseService } from '../core/BaseService.js';
import { Transaction } from '../models/Transaction.js';
import { NotFoundError } from '../core/NotFoundError.js';

export class TransactionService extends BaseService {
    constructor(transactionRepository) {
        super(transactionRepository, Transaction);
        this.transactionRepository = transactionRepository;
    }

    async getByUserId(userId, filters = {}, options = {}) {
        const result = await this.transactionRepository.findByUserId(userId, filters, options);
        return {
            data: result.data.map(transaction => new Transaction(transaction)),
            count: result.count
        };
    }

    async getByUserAndId(userId, transactionId) {
        const transaction = await this.transactionRepository.findByUserAndId(userId, transactionId);
        if (!transaction) {
            throw new NotFoundError('Transaction not found');
        }
        return new Transaction(transaction);
    }

    async create(userId, transactionData) {
        const data = { ...transactionData, user_id: userId };
        return super.create(data);
    }

    async update(userId, transactionId, transactionData) {
        // Verify ownership
        await this.getByUserAndId(userId, transactionId);
        
        const updatedTransaction = await this.transactionRepository.update(transactionId, transactionData);
        return new Transaction(updatedTransaction);
    }

    async delete(userId, transactionId) {
        // Verify ownership
        await this.getByUserAndId(userId, transactionId);
        
        return await this.transactionRepository.delete(transactionId);
    }

    async getStatsSummary(userId, startDate = null, endDate = null) {
        const transactions = await this.transactionRepository.getStatsSummary(userId, startDate, endDate);
        
        return transactions.reduce((acc, transaction) => {
            const amount = parseFloat(transaction.amount);

            if (transaction.transaction_type === 'income') {
                acc.totalIncome += amount;
            } else if (transaction.transaction_type === 'expense') {
                acc.totalExpenses += amount;
            }

            return acc;
        }, { 
            totalIncome: 0, 
            totalExpenses: 0,
            get netIncome() { return this.totalIncome - this.totalExpenses; }
        });
    }

    async getRecentTransactions(userId, limit = 10) {
        const result = await this.getByUserId(userId, {}, { limit });
        return result.data;
    }

    async getMonthlyTrends(userId, months = 12) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const transactions = await this.transactionRepository.getStatsSummary(
            userId, 
            startDate.toISOString(),
            new Date().toISOString()
        );

        const monthlyData = {};

        transactions.forEach(transaction => {
            const date = new Date(transaction.transaction_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    income: 0,
                    expense: 0,
                    transactions: 0
                };
            }

            const amount = parseFloat(transaction.amount);
            monthlyData[monthKey].transactions++;

            if (transaction.transaction_type === 'income') {
                monthlyData[monthKey].income += amount;
            } else if (transaction.transaction_type === 'expense') {
                monthlyData[monthKey].expense += amount;
            }
        });

        return Object.values(monthlyData).map(month => ({
            ...month,
            net: month.income - month.expense,
            savingsRate: month.income > 0 ? ((month.income - month.expense) / month.income) * 100 : 0
        }));
    }
}
