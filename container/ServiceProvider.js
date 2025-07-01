import { Database } from '../core/Database.js';

// Repositories
import { AccountRepository } from '../repositories/AccountRepository.js';
import { TransactionRepository } from '../repositories/TransactionRepository.js';
import { BudgetRepository } from '../repositories/BudgetRepository.js';
import { CategoryRepository } from '../repositories/CategoryRepository.js';
import { TagRepository } from '../repositories/TagRepository.js';
import { ScheduledTransactionRepository } from '../repositories/ScheduledTransactionRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';

// Services
import { AccountService } from '../services/AccountService.js';
import { TransactionService } from '../services/TransactionService.js';
import { BudgetService } from '../services/BudgetService.js';
import { CategoryService } from '../services/CategoryService.js';
import { TagService } from '../services/TagService.js';
import { ScheduledTransactionService } from '../services/ScheduledTransactionService.js';
import { DashboardService } from '../services/DashboardService.js';
import { ReportService } from '../services/ReportService.js';
import { AuthService } from '../services/AuthService.js';
import { UserService } from '../services/UserService.js';

// Controllers
import { AccountController } from '../controllers/AccountController.js';
import { TransactionController } from '../controllers/TransactionController.js';
import { BudgetController } from '../controllers/BudgetController.js';
import { CategoryController } from '../controllers/CategoryController.js';
import { TagController } from '../controllers/TagController.js';
import { ScheduledTransactionController } from '../controllers/ScheduledTransactionController.js';
import { DashboardController } from '../controllers/DashboardController.js';
import { ReportController } from '../controllers/ReportController.js';
import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
import { ImportExportService } from "../services/ImportExportService.js";
import { ImportExportController } from "../controllers/ImportExportController.js";
import {TwoFactorAuthRepository} from "../repositories/TwoFactorAuthRepository.js";
import {TwoFactorAuthService} from "../services/TwoFactorAuthService.js";
import {TwoFactorAuthController} from "../controllers/TwoFactorAuthController.js";

export class ServiceProvider {
    static register(container) {
        // Core
        container.register('database', () => new Database());

        // Repositories
        container.register('accountRepository', (c) =>
            new AccountRepository(c.get('database'))
        );
        container.register('transactionRepository', (c) =>
            new TransactionRepository(c.get('database'))
        );
        container.register('budgetRepository', (c) =>
            new BudgetRepository(c.get('database'))
        );
        container.register('categoryRepository', (c) =>
            new CategoryRepository(c.get('database'))
        );
        container.register('tagRepository', (c) =>
            new TagRepository(c.get('database'))
        );
        container.register('scheduledTransactionRepository', (c) =>
            new ScheduledTransactionRepository(c.get('database'))
        );
        container.register('userRepository', (c) =>
            new UserRepository(c.get('database'))
        );
        container.register('twoFactorAuthRepository', (c) =>
            new TwoFactorAuthRepository(c.get('database'))
        );

        // Services
        container.register('accountService', (c) =>
            new AccountService(c.get('accountRepository'))
        );
        container.register('transactionService', (c) =>
            new TransactionService(c.get('transactionRepository'))
        );
        container.register('budgetService', (c) =>
            new BudgetService(c.get('budgetRepository'), c.get('transactionRepository'))
        );
        container.register('categoryService', (c) =>
            new CategoryService(c.get('categoryRepository'))
        );
        container.register('tagService', (c) =>
            new TagService(c.get('tagRepository'))
        );
        container.register('scheduledTransactionService', (c) =>
            new ScheduledTransactionService(
                c.get('scheduledTransactionRepository'),
                c.get('transactionRepository')
            )
        );
        container.register('dashboardService', (c) =>
            new DashboardService(
                c.get('accountService'),
                c.get('transactionService'),
                c.get('budgetService'),
                c.get('scheduledTransactionService')
            )
        );
        container.register('reportService', (c) =>
            new ReportService(
                c.get('transactionRepository'),
                c.get('budgetRepository'),
                c.get('accountService')
            )
        );
        container.register('authService', (c) =>
            new AuthService(c.get('database'), c.get('twoFactorAuthRepository'))
        );
        container.register('userService', (c) =>
            new UserService(c.get('userRepository'), c.get('twoFactorAuthRepository'))
        );
        container.register('importExportService', (c) =>
            new ImportExportService(
                c.get('transactionRepository'),
                c.get('accountRepository'),
                c.get('categoryRepository'),
                c.get('budgetRepository')
            )
        );
        container.register('twoFactorAuthService', (c) =>
            new TwoFactorAuthService(c.get('twoFactorAuthRepository'))
        );

        // Controllers
        container.register('accountController', (c) =>
            new AccountController(c.get('accountService'))
        );
        container.register('transactionController', (c) =>
            new TransactionController(c.get('transactionService'))
        );
        container.register('budgetController', (c) =>
            new BudgetController(c.get('budgetService'))
        );
        container.register('categoryController', (c) =>
            new CategoryController(c.get('categoryService'))
        );
        container.register('tagController', (c) =>
            new TagController(c.get('tagService'))
        );
        container.register('scheduledTransactionController', (c) =>
            new ScheduledTransactionController(c.get('scheduledTransactionService'))
        );
        container.register('dashboardController', (c) =>
            new DashboardController(c.get('dashboardService'))
        );
        container.register('reportController', (c) =>
            new ReportController(c.get('reportService'))
        );
        container.register('authController', (c) =>
            new AuthController(c.get('authService'))
        );
        container.register('userController', (c) =>
            new UserController(
                c.get('userService'),
                c.get('twoFactorAuthService')
            )
        );
        container.register('importExportController', (c) =>
            new ImportExportController(c.get('importExportService'))
        );
        container.register('twoFactorAuthController', (c) =>
            new TwoFactorAuthController(c.get('twoFactorAuthService'), c.get('userService'))
        );

        return container;
    }
}