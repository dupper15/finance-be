import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import { Readable } from 'stream';
import { ValidationError } from '../core/ValidationError.js';
import puppeteer from 'puppeteer';

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
            const csvData = this.convertToCSV(exportData);
            const csvBuffer = Buffer.from('\uFEFF' + csvData, 'utf8');

            return {
                data: csvBuffer,
                contentType: 'text/csv; charset=utf-8',
                filename: 'transactions.csv'
            };
        } else if (format === 'excel') {
            const workbook = this.convertToExcel(exportData);
            const buffer = XLSX.write(workbook, {
                type: 'buffer',
                bookType: 'xlsx',
                bookSST: true,
                cellStyles: true
            });

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
        const buffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
            bookSST: true,
            cellStyles: true
        });

        return {
            data: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: 'budget-report.xlsx'
        };
    }

    async parseCSV(buffer) {
        return new Promise((resolve, reject) => {
            const results = [];
            const csvString = buffer.toString('utf8').replace(/^\uFEFF/, '');
            const stream = Readable.from(csvString);

            stream
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    async parseExcel(buffer) {
        const workbook = XLSX.read(buffer, {
            type: 'buffer',
            cellText: false,
            cellDates: true,
            bookVBA: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd'
        });
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

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new ValidationError('Invalid amount');
        }

        const validTypes = ['income', 'expense', 'transfer'];
        const normalizedType = type.toLowerCase();
        if (!validTypes.includes(normalizedType)) {
            throw new ValidationError('Invalid transaction type');
        }

        const accounts = await this.accountRepository.findByUserId(userId);
        const account = accounts.find(acc =>
            acc.name.toLowerCase() === accountName.toLowerCase()
        );

        if (!account) {
            throw new ValidationError(`Account not found: ${accountName}`);
        }

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
        const csvRows = [];

        csvRows.push(headers.map(header => `"${header}"`).join(','));

        for (const item of data) {
            const row = headers.map(header => {
                const value = item[header] || '';
                const stringValue = String(value).replace(/"/g, '""');
                return `"${stringValue}"`;
            });
            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }

    convertToExcel(data) {
        if (!data || data.length === 0) {
            const worksheet = XLSX.utils.aoa_to_sheet([]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
            return workbook;
        }

        const worksheet = XLSX.utils.json_to_sheet(data, {
            header: Object.keys(data[0]),
            skipHeader: false
        });

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + "1";
            if (!worksheet[address]) continue;
            worksheet[address].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "FFFFAA00" } }
            };
        }

        worksheet['!cols'] = Object.keys(data[0]).map(() => ({ wch: 15 }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

        return workbook;
    }
    async exportReport(userId, month = null, year = null, accountId = null) {
        const filters = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            filters.start_date = startDate.toISOString().split('T')[0];
            filters.end_date = endDate.toISOString().split('T')[0];
        }
        if (accountId) {
            filters.account_id = accountId;
        }

        try {
            const [transactions, accounts] = await Promise.all([
                this.transactionRepository.findByUserId(userId, filters),
                this.accountRepository.findByUserId(userId)
            ]);

            // Try to fetch budgets, but don't fail if there's an error
            let budgets = [];
            try {
                budgets = await this.budgetRepository.findByUserId(userId);
            } catch (budgetError) {
                console.warn('Could not fetch budgets for report:', budgetError.message);
            }

            const reportData = {
                period: month && year ? `Tháng ${month}/${year}` : 'Tất cả thời gian',
                generatedAt: new Date().toLocaleString('vi-VN'),
                summary: this.calculateSummary(transactions.data),
                transactions: transactions.data,
                budgets: budgets,
                accounts: accounts
            };

            const htmlContent = this.generateHTML(reportData);
            const pdfBuffer = await this.convertHTMLToPDF(htmlContent);

            return {
                data: pdfBuffer,
                contentType: 'application/pdf',
                filename: `bao-cao-tai-chinh-${month || 'all'}-${year || new Date().getFullYear()}.pdf`
            };
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    calculateSummary(transactions) {
        const summary = {
            totalIncome: 0,
            totalExpenses: 0,
            netAmount: 0,
            transactionCount: transactions.length,
            incomeByCategory: {},
            expensesByCategory: {}
        };

        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            const categoryName = transaction.categories?.name || 'Không phân loại';

            if (transaction.transaction_type === 'income') {
                summary.totalIncome += amount;
                summary.incomeByCategory[categoryName] = (summary.incomeByCategory[categoryName] || 0) + amount;
            } else if (transaction.transaction_type === 'expense') {
                summary.totalExpenses += amount;
                summary.expensesByCategory[categoryName] = (summary.expensesByCategory[categoryName] || 0) + amount;
            }
        });

        summary.netAmount = summary.totalIncome - summary.totalExpenses;
        return summary;
    }

    generateHTML(reportData) {
        const incomeData = Object.entries(reportData.summary.incomeByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        const expenseData = Object.entries(reportData.summary.expensesByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        // Generate monthly data for the past 12 months
        const monthlyData = this.generateMonthlyData(reportData.transactions);

        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Báo cáo tài chính</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section h3 { border-bottom: 2px solid #4CAF50; padding-bottom: 5px; margin-bottom: 15px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .amount { text-align: right; font-weight: bold; }
            .income { color: #28a745; }
            .expense { color: #dc3545; }
            .chart-container { margin: 20px 0; page-break-inside: avoid; }
            .chart-wrapper { display: inline-block; width: 48%; vertical-align: top; margin: 1%; }
            .chart-full { width: 98%; margin: 1%; }
            .summary-cards { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .summary-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; width: 23%; text-align: center; }
            .summary-card h4 { margin: 0 0 10px 0; color: #495057; font-size: 14px; }
            .summary-card .value { font-size: 18px; font-weight: bold; margin: 5px 0; }
            .summary-card .change { font-size: 12px; }
            .positive { color: #28a745; }
            .negative { color: #dc3545; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>BÁO CÁO TÀI CHÍNH</h1>
            <p>Kỳ báo cáo: ${reportData.period}</p>
            <p>Ngày tạo: ${reportData.generatedAt}</p>
        </div>

        <div class="summary-cards">
            <div class="summary-card">
                <h4>TỔNG THU NHẬP</h4>
                <div class="value income">${this.formatCurrency(reportData.summary.totalIncome)}</div>
            </div>
            <div class="summary-card">
                <h4>TỔNG CHI TIÊU</h4>
                <div class="value expense">${this.formatCurrency(reportData.summary.totalExpenses)}</div>
            </div>
            <div class="summary-card">
                <h4>SỐ DƯ RÒNG</h4>
                <div class="value ${reportData.summary.netAmount >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(reportData.summary.netAmount)}</div>
            </div>
            <div class="summary-card">
                <h4>SỐ GIAO DỊCH</h4>
                <div class="value">${reportData.summary.transactionCount}</div>
            </div>
        </div>

        <div class="section">
            <h3>XU HƯỚNG HÀNG THÁNG (12 THÁNG)</h3>
            <div class="chart-container chart-full">
                <canvas id="monthlyTrendChart" width="800" height="300"></canvas>
            </div>
        </div>

        <div class="section">
            <h3>SO SÁNH THU NHẬP VS CHI TIÊU</h3>
            <div class="chart-container chart-full">
                <canvas id="incomeExpenseChart" width="800" height="300"></canvas>
            </div>
        </div>

        ${incomeData.length > 0 ? `
        <div class="section">
            <h3>THU NHẬP THEO DANH MỤC</h3>
            <div class="chart-wrapper">
                <canvas id="incomePieChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-wrapper">
                <canvas id="incomeBarChart" width="400" height="300"></canvas>
            </div>
        </div>
        ` : ''}

        ${expenseData.length > 0 ? `
        <div class="section">
            <h3>CHI TIÊU THEO DANH MỤC</h3>
            <div class="chart-wrapper">
                <canvas id="expensePieChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-wrapper">
                <canvas id="expenseBarChart" width="400" height="300"></canvas>
            </div>
        </div>
        ` : ''}

        ${reportData.accounts.length > 0 ? `
        <div class="section">
            <h3>SỐ DƯ TÀI KHOẢN</h3>
            <div class="chart-container chart-full">
                <canvas id="accountBalanceChart" width="800" height="300"></canvas>
            </div>
        </div>
        ` : ''}

        ${reportData.transactions.length > 0 ? `
        <div class="section">
            <h3>CHI TIẾT GIAO DỊCH (${Math.min(reportData.transactions.length, 50)} GIAO DỊCH GẦN NHẤT)</h3>
            <table>
                <thead>
                    <tr><th>Ngày</th><th>Mô tả</th><th>Số tiền</th><th>Loại</th><th>Tài khoản</th><th>Danh mục</th></tr>
                </thead>
                <tbody>
                    ${reportData.transactions.slice(0, 50).map(transaction => `
                        <tr>
                            <td>${new Date(transaction.transaction_date).toLocaleDateString('vi-VN')}</td>
                            <td>${transaction.description}</td>
                            <td class="amount ${transaction.transaction_type}">${this.formatCurrency(transaction.amount)}</td>
                            <td>${transaction.transaction_type === 'income' ? 'Thu' : 'Chi'}</td>
                            <td>${transaction.accounts?.name || ''}</td>
                            <td>${transaction.categories?.name || 'Không phân loại'}</td>
                        </tr>
                    `).join('')}
                    ${reportData.transactions.length > 50 ?
            `<tr><td colspan="6" style="text-align: center; font-style: italic;">... và ${reportData.transactions.length - 50} giao dịch khác</td></tr>`
            : ''
        }
                </tbody>
            </table>
        </div>
        ` : ''}

        <script>
            // Set Chart.js defaults
            Chart.defaults.font.size = 11;
            Chart.defaults.plugins.legend.position = 'bottom';

            // Monthly Trend Chart
            const monthlyCtx = document.getElementById('monthlyTrendChart').getContext('2d');
            new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(monthlyData.labels)},
                    datasets: [{
                        label: 'Thu nhập',
                        data: ${JSON.stringify(monthlyData.income)},
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Chi tiêu',
                        data: ${JSON.stringify(monthlyData.expenses)},
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + new Intl.NumberFormat('vi-VN').format(context.parsed.y) + ' đ';
                                }
                            }
                        }
                    }
                }
            });

            // Income vs Expense Bar Chart
            const incomeExpenseCtx = document.getElementById('incomeExpenseChart').getContext('2d');
            new Chart(incomeExpenseCtx, {
                type: 'bar',
                data: {
                    labels: ['Thu nhập', 'Chi tiêu', 'Số dư ròng'],
                    datasets: [{
                        data: [${reportData.summary.totalIncome}, ${reportData.summary.totalExpenses}, ${Math.abs(reportData.summary.netAmount)}],
                        backgroundColor: ['#28a745', '#dc3545', '${reportData.summary.netAmount >= 0 ? '#28a745' : '#dc3545'}'],
                        borderColor: ['#1e7e34', '#c82333', '${reportData.summary.netAmount >= 0 ? '#1e7e34' : '#c82333'}'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
                                }
                            }
                        }
                    }
                }
            });

            ${incomeData.length > 0 ? `
            // Income Pie Chart
            const incomePieCtx = document.getElementById('incomePieChart').getContext('2d');
            new Chart(incomePieCtx, {
                type: 'doughnut',
                data: {
                    labels: ${JSON.stringify(incomeData.map(([name]) => name))},
                    datasets: [{
                        data: ${JSON.stringify(incomeData.map(([, amount]) => amount))},
                        backgroundColor: ['#28a745', '#20c997', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#ffc107', '#6c757d'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Thu nhập theo danh mục' }
                    }
                }
            });

            // Income Bar Chart
            const incomeBarCtx = document.getElementById('incomeBarChart').getContext('2d');
            new Chart(incomeBarCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(incomeData.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name))},
                    datasets: [{
                        data: ${JSON.stringify(incomeData.map(([, amount]) => amount))},
                        backgroundColor: '#28a745',
                        borderColor: '#1e7e34',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Thu nhập theo danh mục' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
                                }
                            }
                        }
                    }
                }
            });
            ` : ''}

            ${expenseData.length > 0 ? `
            // Expense Pie Chart
            const expensePieCtx = document.getElementById('expensePieChart').getContext('2d');
            new Chart(expensePieCtx, {
                type: 'doughnut',
                data: {
                    labels: ${JSON.stringify(expenseData.map(([name]) => name))},
                    datasets: [{
                        data: ${JSON.stringify(expenseData.map(([, amount]) => amount))},
                        backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#17a2b8', '#6f42c1', '#e83e8c', '#6c757d'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Chi tiêu theo danh mục' }
                    }
                }
            });

            // Expense Bar Chart
            const expenseBarCtx = document.getElementById('expenseBarChart').getContext('2d');
            new Chart(expenseBarCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(expenseData.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name))},
                    datasets: [{
                        data: ${JSON.stringify(expenseData.map(([, amount]) => amount))},
                        backgroundColor: '#dc3545',
                        borderColor: '#c82333',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Chi tiêu theo danh mục' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
                                }
                            }
                        }
                    }
                }
            });
            ` : ''}

            ${reportData.accounts.length > 0 ? `
            // Account Balance Chart
            const accountCtx = document.getElementById('accountBalanceChart').getContext('2d');
            new Chart(accountCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(reportData.accounts.map(acc => acc.name))},
                    datasets: [{
                        label: 'Số dư',
                        data: ${JSON.stringify(reportData.accounts.map(acc => parseFloat(acc.balance || 0)))},
                        backgroundColor: '#17a2b8',
                        borderColor: '#138496',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
                                }
                            }
                        }
                    }
                }
            });
            ` : ''}
        </script>
    </body>
    </html>
    `;
    }
    generateMonthlyData(transactions) {
        const now = new Date();
        const monthlyData = {
            labels: [],
            income: [],
            expenses: []
        };

        // Generate last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });

            const monthIncome = transactions
                .filter(t => {
                    const tDate = new Date(t.transaction_date);
                    return tDate.getMonth() === date.getMonth() &&
                        tDate.getFullYear() === date.getFullYear() &&
                        t.transaction_type === 'income';
                })
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const monthExpenses = transactions
                .filter(t => {
                    const tDate = new Date(t.transaction_date);
                    return tDate.getMonth() === date.getMonth() &&
                        tDate.getFullYear() === date.getFullYear() &&
                        t.transaction_type === 'expense';
                })
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            monthlyData.labels.push(monthLabel);
            monthlyData.income.push(monthIncome);
            monthlyData.expenses.push(monthExpenses);
        }

        return monthlyData;
    }

    async convertHTMLToPDF(htmlContent) {
        const puppeteer = await import('puppeteer');

        const browser = await puppeteer.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Wait for charts to render using a Promise-based delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Alternative: Wait for Chart.js to finish rendering
        await page.waitForFunction(() => {
            return window.Chart && document.querySelectorAll('canvas').length > 0;
        }, { timeout: 10000 });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        });

        await browser.close();
        return pdf;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
}