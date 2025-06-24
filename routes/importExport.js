import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Readable } from 'stream';

const router = express.Router();
router.use(authenticateToken);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});

// Import transactions from CSV/Excel
router.post('/import/transactions', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let transactions = [];

        if (req.file.mimetype === 'text/csv') {
            // Parse CSV
            transactions = await parseCSV(req.file.buffer);
        } else {
            // Parse Excel
            transactions = await parseExcel(req.file.buffer);
        }

        // Validate and transform transactions
        const validTransactions = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            try {
                const transaction = await validateAndTransformTransaction(transactions[i], req.user.id);
                validTransactions.push(transaction);
            } catch (error) {
                errors.push({
                    row: i + 1,
                    error: error.message,
                    data: transactions[i]
                });
            }
        }

        // Insert valid transactions
        let insertedCount = 0;
        if (validTransactions.length > 0) {
            const { data, error } = await supabase
                .from('transactions')
                .insert(validTransactions)
                .select();

            if (error) throw error;
            insertedCount = data.length;
        }

        res.json({
            message: 'Import completed',
            imported: insertedCount,
            errors: errors.length,
            errorDetails: errors
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export transactions to CSV
router.get('/export/transactions', async (req, res) => {
    try {
        const { start_date, end_date, format = 'csv' } = req.query;

        let query = supabase
            .from('transactions')
            .select(`
        transaction_date,
        description,
        amount,
        transaction_type,
        accounts(name),
        categories(name),
        tags(name),
        memo
      `)
            .eq('user_id', req.user.id);

        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);

        const { data, error } = await query.order('transaction_date', { ascending: false });

        if (error) throw error;

        if (format === 'csv') {
            const csv = convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
            res.send(csv);
        } else if (format === 'excel') {
            const workbook = convertToExcel(data);
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
            res.send(buffer);
        } else {
            res.status(400).json({ error: 'Invalid format. Use csv or excel.' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export budget report
router.get('/export/budget-report', async (req, res) => {
    try {
        const { data: budgets, error } = await supabase
            .from('budgets')
            .select(`
        name,
        amount,
        start_date,
        end_date,
        categories(name),
        accounts(name)
      `)
            .eq('user_id', req.user.id)
            .eq('is_active', true);

        if (error) throw error;

        const reportData = budgets.map(budget => ({
            'Budget Name': budget.name,
            'Amount': budget.amount,
            'Start Date': budget.start_date,
            'End Date': budget.end_date,
            'Category': budget.categories?.name || 'All',
            'Account': budget.accounts?.name || 'All'
        }));

        const workbook = convertToExcel(reportData);
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=budget-report.xlsx');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper functions
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer.toString());

        stream
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
};

const parseExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
};

const validateAndTransformTransaction = async (row, userId) => {
    // Map common field variations
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
        throw new Error('Missing required fields: date, description, amount, type, account');
    }

    // Validate and parse amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
    }

    // Validate transaction type
    const validTypes = ['income', 'expense', 'transfer'];
    const normalizedType = type.toLowerCase();
    if (!validTypes.includes(normalizedType)) {
        throw new Error('Invalid transaction type');
    }

    // Find account ID
    const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('account_id')
        .eq('user_id', userId)
        .ilike('name', accountName)
        .limit(1);

    if (accountError) throw new Error('Error finding account');
    if (!accounts || accounts.length === 0) {
        throw new Error(`Account not found: ${accountName}`);
    }

    // Find category ID (optional)
    let categoryId = null;
    if (categoryName) {
        const { data: categories } = await supabase
            .from('categories')
            .select('category_id')
            .or(`user_id.eq.${userId},is_default.eq.true`)
            .ilike('name', categoryName)
            .limit(1);

        if (categories && categories.length > 0) {
            categoryId = categories[0].category_id;
        }
    }

    return {
        account_id: accounts[0].account_id,
        description,
        amount: parsedAmount,
        transaction_date: new Date(date).toISOString(),
        transaction_type: normalizedType,
        category_id: categoryId,
        user_id: userId
    };
};

const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = [
        'Date',
        'Description',
        'Amount',
        'Type',
        'Account',
        'Category',
        'Tag',
        'Memo'
    ];

    const rows = data.map(transaction => [
        transaction.transaction_date,
        transaction.description,
        transaction.amount,
        transaction.transaction_type,
        transaction.accounts?.name || '',
        transaction.categories?.name || '',
        transaction.tags?.name || '',
        transaction.memo || ''
    ]);

    return [headers, ...rows]
        .map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');
};

const convertToExcel = (data) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    return workbook;
};

export default router;