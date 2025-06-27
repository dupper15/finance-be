# Personal Finance Management API

A modern, comprehensive RESTful API for personal finance management built with Node.js, Express.js, and Supabase. Features a clean object-oriented architecture with robust authentication, transaction management, budgeting tools, and financial reporting.

## 🚀 Features

### Core Financial Management
- **Multi-Account Support**: Checking, savings, credit cards, investments, loans, and cash accounts
- **Transaction Tracking**: Income, expenses, and transfers with categorization and tagging
- **Budget Management**: Flexible budgets with real-time progress tracking and alerts
- **Scheduled Transactions**: Automated recurring payments and income with multiple frequency options
- **Financial Reporting**: Comprehensive analytics including trends, category breakdowns, and performance metrics

### Data Management
- **Import/Export**: CSV and Excel file support for transaction data
- **Real-time Dashboard**: Account balances, recent activity, and budget alerts
- **Advanced Filtering**: Search and filter transactions by date, category, account, and amount
- **Data Validation**: Comprehensive input validation and error handling

### Security & Authentication
- **Supabase Authentication**: Secure user registration and login
- **JWT Token Management**: Stateless authentication with refresh tokens
- **Rate Limiting**: Protection against API abuse
- **Input Sanitization**: XSS and injection attack prevention

## 🏗️ Architecture

Built with object-oriented design principles:

- **Controller Layer**: HTTP request handling and response formatting
- **Service Layer**: Business logic and domain operations
- **Repository Layer**: Data access abstraction
- **Model Layer**: Domain entities with validation and serialization
- **Middleware**: Authentication, validation, logging, and error handling

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account and project
- PostgreSQL database (provided by Supabase)

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personal-finance-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

## 🔧 Environment Configuration

```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
JWT_SECRET=your_jwt_secret_key
```

## 📚 API Documentation

### Authentication Endpoints
```http
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
GET    /api/auth/confirm      # Email confirmation
```

### Account Management
```http
GET    /api/accounts          # List user accounts
POST   /api/accounts          # Create new account
GET    /api/accounts/:id      # Get account details
PUT    /api/accounts/:id      # Update account
DELETE /api/accounts/:id      # Delete account
GET    /api/accounts/:id/balance-history  # Account balance history
```

### Transaction Management
```http
GET    /api/transactions                  # List transactions (with filters)
POST   /api/transactions                  # Create transaction
GET    /api/transactions/:id              # Get transaction details
PUT    /api/transactions/:id              # Update transaction
DELETE /api/transactions/:id              # Delete transaction
GET    /api/transactions/stats/summary    # Transaction statistics
```

### Budget Management
```http
GET    /api/budgets           # List budgets
POST   /api/budgets           # Create budget
GET    /api/budgets/:id       # Get budget details
PUT    /api/budgets/:id       # Update budget
DELETE /api/budgets/:id       # Delete budget
GET    /api/budgets/:id/progress  # Budget progress tracking
```

### Categories & Tags
```http
GET    /api/categories        # List categories
POST   /api/categories        # Create category
PUT    /api/categories/:id    # Update category
DELETE /api/categories/:id    # Delete category

GET    /api/tags              # List tags
POST   /api/tags              # Create tag
PUT    /api/tags/:id          # Update tag
DELETE /api/tags/:id          # Delete tag
```

### Scheduled Transactions
```http
GET    /api/scheduled-transactions       # List scheduled transactions
POST   /api/scheduled-transactions       # Create scheduled transaction
PUT    /api/scheduled-transactions/:id   # Update scheduled transaction
DELETE /api/scheduled-transactions/:id   # Delete scheduled transaction
PATCH  /api/scheduled-transactions/:id/toggle  # Toggle active status
```

### Reports & Analytics
```http
GET    /api/reports/income-expense       # Income vs expense analysis
GET    /api/reports/expense-by-category  # Category breakdown
GET    /api/reports/account-balances     # Account balance summary
GET    /api/reports/monthly-trends       # Monthly trend analysis
GET    /api/reports/budget-performance   # Budget performance report
```

### Import/Export
```http
POST   /api/import-export/import/transactions    # Import transaction data
GET    /api/import-export/export/transactions    # Export transactions
GET    /api/import-export/export/budget-report   # Export budget report
```

### Dashboard
```http
GET    /api/dashboard         # Dashboard summary data
```

### System
```http
GET    /health                # Health check endpoint
```

## 📝 Request/Response Examples

### Create Transaction
```json
POST /api/transactions
{
  "account_id": "uuid",
  "description": "Grocery shopping",
  "amount": 85.50,
  "transaction_date": "2024-01-15",
  "transaction_type": "expense",
  "category_id": "uuid",
  "memo": "Weekly groceries"
}
```

### Query Transactions
```http
GET /api/transactions?start_date=2024-01-01&end_date=2024-01-31&category_id=uuid&limit=50&page=1
```

### Create Budget
```json
POST /api/budgets
{
  "name": "Monthly Groceries",
  "amount": 400.00,
  "duration": "monthly",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "category_id": "uuid"
}
```

## 🛡️ Security Features

- **Authentication**: JWT-based authentication with Supabase
- **Authorization**: User-scoped data access
- **Rate Limiting**: Configurable request rate limits
- **Input Validation**: Comprehensive request validation using Joi
- **SQL Injection Protection**: Parameterized queries via Supabase client
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers middleware

## 🔍 Error Handling

The API provides consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Detailed error information"]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 📊 Database Schema

The system uses Supabase PostgreSQL with the following main tables:
- `users` - User accounts (managed by Supabase Auth)
- `accounts` - Financial accounts
- `transactions` - Financial transactions
- `categories` - Transaction categories
- `tags` - Transaction tags
- `budgets` - Budget definitions
- `scheduled_transactions` - Recurring transactions

## 🧪 Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm start            # Start production server
npm test             # Run test suite
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Project Structure
```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── models/          # Domain entities
├── middleware/      # Request/response middleware
├── routes/          # Route definitions
├── core/            # Base classes and utilities
└── container/       # Dependency injection
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [API Documentation](link-to-detailed-docs)
- 🐛 [Issue Tracker](link-to-issues)
- 💬 [Discussions](link-to-discussions)

---

**Built with ❤️ using Node.js, Express.js, and Supabase**
