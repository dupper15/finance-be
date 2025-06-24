# Personal Finance Management Backend API

A comprehensive Node.js backend API for personal finance management built with Express.js and Supabase.

## Features

- **Authentication**: User registration, login, logout with Supabase Auth
- **Account Management**: Multiple account types (checking, savings, credit card, etc.)
- **Transaction Management**: Income, expense, and transfer tracking
- **Categories & Tags**: Hierarchical categorization and tagging system
- **Budgets**: Flexible budget creation and monitoring
- **Scheduled Transactions**: Recurring payments and income
- **Reports**: Comprehensive financial reporting and analytics
- **Import/Export**: CSV and Excel file support
- **Real-time Notifications**: Budget alerts and upcoming payments

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see .env.example)
4. Start the server: `npm run dev`

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout

### Accounts
- GET `/api/accounts` - Get all accounts
- POST `/api/accounts` - Create new account
- PUT `/api/accounts/:id` - Update account
- DELETE `/api/accounts/:id` - Delete account

### Transactions
- GET `/api/transactions` - Get transactions with filters
- POST `/api/transactions` - Create transaction
- PUT `/api/transactions/:id` - Update transaction
- DELETE `/api/transactions/:id` - Delete transaction

### Budgets
- GET `/api/budgets` - Get all budgets
- POST `/api/budgets` - Create budget
- GET `/api/budgets/:id/progress` - Get budget progress

### Reports
- GET `/api/reports/income-expense` - Income vs expense report
- GET `/api/reports/expense-by-category` - Category breakdown
- GET `/api/reports/monthly-trends` - Monthly trends analysis

### Import/Export
- POST `/api/import-export/import/transactions` - Import transactions
- GET `/api/import-export/export/transactions` - Export transactions

## Environment Variables

```
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

## Testing

Run tests with: `npm test`