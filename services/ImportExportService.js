import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import { Readable } from 'stream';
import { ValidationError } from '../core/ValidationError.js';

export class ImportExportService {
    constructor(transactionRepository, accountRepository, categoryRepository, budgetRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.budgetRepository = budgetRepository;
    }

    async importTransactions(userId, fileBuffer, mimetype) {
        let transactions = [];

        if (mimetype === 'text/csv') {
            transactions = await this.parseCSV(fileBuffer);
        } else {
            transactions = await this.parseExcel(fileBuffer);
        }

        const validTransactions = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            try {
                const transaction = await this.validateAndTransformTransaction(transactions[i], userId);
                validTransactions.push(transaction);
            } catch (error) {
                errors.push({
                    row: i + 1,
                    error: error.message,
                    data: transactions[i]
                });
            }
        }

        let insertedCount = 0;
        if (validTransactions.length > 0) {
            for (const transaction of validTransactions) {
                try {
                    await this.transactionRepository.create(transaction);
                    insertedCount++;
                } catch (error) {
                    errors.push({
                        row: insertedCount + 1,
                        error: error.message,
                        data: transaction
                    });
                }
            }
        }

        return {
            message: 'Import completed',
            imported: insertedCount,
            errors: errors.length,
            errorDetails: errors
        };
    }

    async exportTransactions(userId, startDate = null, endDate = null, format = 'csv') {
        const filters = {};
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;

        const result = await this.transactionRepository.findByUserId(userId, filters);
        const transactions = result.data;

        const exportData = transactions.map(transaction => ({
            'Date': transaction.transaction_date,
            'Description': transaction.description,
            'Amount': transaction.amount,
            'Type': transaction.transaction_type,
            'Account': transaction.accounts?.name || '',
            'Category': transaction.categories?.name || '',
            'Tag': transaction.tags?.name || '',
            'Memo': transaction.memo || ''
        }));

        if (format === 'csv') {
            return {
                data: this.convertToCSV(exportData),
                contentType: 'text/csv',
                filename: 'transactions.csv'
            };
        } else if (format === 'excel') {
            const workbook = this.convertToExcel(exportData);
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            return {
                data: buffer,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                filename: 'transactions.xlsx'
            };
        }

        throw new Error('Invalid export format');
    }

    async exportBudgetReport(userId) {
        const budgets = await this.budgetRepository.findByUserId(userId);

        const reportData = budgets.map(budget => ({
            'Budget Name': budget.name,
            'Amount': budget.amount,
            'Start Date': budget.start_date,
            'End Date': budget.end_date,
            'Category': budget.categories?.name || 'All',
            'Account': budget.accounts?.name || 'All'
        }));

        const workbook = this.convertToExcel(reportData);
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return {
            data: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: 'budget-report.xlsx'
        };
    }

    // Private helper methods
    async parseCSV(buffer) {
        return new Promise((resolve, reject) => {
            const results = [];
            const stream = Readable.from(buffer.toString());

            stream
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    async parseExcel(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    }

    async validateAndTransformTransaction(row, userId) {
        const fieldMappings = {
            date: ['date', 'transaction_date', 'Date', 'Transaction Date'],
            description: ['description', 'Description', 'memo', 'Memo'],
            amount: ['amount', 'Amount', 'value', 'Value'],
            type: ['type', 'transaction_type', 'Type', 'Transaction Type'],
            account: ['account', 'Account', 'account_name', 'Account Name'],
            category: ['category', 'Category', 'category_name', 'Category Name']
        };

        const getValue = (mappings, row) => {
            for (const field of mappings) {
                if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                    return row[field];
                }
            }
            return null;
        };

        const date = getValue(fieldMappings.date, row);
        const description = getValue(fieldMappings.description, row);
        const amount = getValue(fieldMappings.amount, row);
        const type = getValue(fieldMappings.type, row);
        const accountName = getValue(fieldMappings.account, row);
        const categoryName = getValue(fieldMappings.category, row);

        if (!date || !description || !amount || !type || !accountName) {
            throw new ValidationError('Missing required fields: date, description, amount, type, account');
        }

        // Validate and parse amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new ValidationError('Invalid amount');
        }

        // Validate transaction type
        const validTypes = ['income', 'expense', 'transfer'];
        const normalizedType = type.toLowerCase();
        if (!validTypes.includes(normalizedType)) {
            throw new ValidationError('Invalid transaction type');
        }

        // Find account ID
        const accounts = await this.accountRepository.findByUserId(userId);
        const account = accounts.find(acc =>
            acc.name.toLowerCase() === accountName.toLowerCase()
        );

        if (!account) {
            throw new ValidationError(`Account not found: ${accountName}`);
        }

        // Find category ID (optional)
        let categoryId = null;
        if (categoryName) {
            const categories = await this.categoryRepository.findByUserId(userId, true);
            const category = categories.find(cat =>
                cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (category) {
                categoryId = category.category_id;
            }
        }

        return {
            account_id: account.account_id,
            description,
            amount: parsedAmount,
            transaction_date: new Date(date).toISOString(),
            transaction_type: normalizedType,
            category_id: categoryId,
            user_id: userId
        };
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const rows = data.map(item =>
            headers.map(header => `"${(item[header] || '').toString().replace(/"/g, '""')}"`)
        );

        return [
            headers.map(header => `"${header}"`).join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }

    convertToExcel(data) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        return workbook;
    }
}