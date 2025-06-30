import { BaseService } from "../core/BaseService.js";
import { Budget } from "../models/Budget.js";
import { NotFoundError } from "../core/NotFoundError.js";

export class BudgetService extends BaseService {
  constructor(budgetRepository, transactionRepository) {
    super(budgetRepository, Budget);
    this.budgetRepository = budgetRepository;
    this.transactionRepository = transactionRepository;
  }

  async getByUserId(userId, includeInactive = false) {
    const budgets = await this.budgetRepository.findByUserId(
      userId,
      includeInactive
    );
    console.log(
      "dsf",
      budgets.map((budget) => new Budget(budget))
    );
    return budgets.map((budget) => new Budget(budget));
  }

  async getByUserAndId(userId, budgetId) {
    const budget = await this.budgetRepository.findByUserAndId(
      userId,
      budgetId
    );
    if (!budget) {
      throw new NotFoundError("Budget not found");
    }
    return new Budget(budget);
  }

  async create(userId, budgetData) {
    const data = { ...budgetData, user_id: userId };
    return super.create(data);
  }

  async update(userId, budgetId, budgetData) {
    // Verify ownership
    await this.getByUserAndId(userId, budgetId);

    const updatedBudget = await this.budgetRepository.update(
      budgetId,
      budgetData
    );
    return new Budget(updatedBudget);
  }

  async delete(userId, budgetId) {
    // Verify ownership
    await this.getByUserAndId(userId, budgetId);

    return await this.budgetRepository.delete(budgetId);
  }

  async softDelete(userId, budgetId) {
    // Verify ownership
    await this.getByUserAndId(userId, budgetId);

    const result = await this.budgetRepository.softDelete(budgetId);
    return new Budget(result);
  }

  async getBudgetsByPeriod(userId, month, year) {
    const startDate = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const budgets = await this.budgetRepository.findByPeriod(
      userId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    const grouped = {};

    for (const budgetData of budgets) {
      const budget = new Budget(budgetData);
      const categoryId = budget.category_id;

      if (!categoryId || !budgetData.categories) continue;

      if (!grouped[categoryId]) {
        grouped[categoryId] = {
          category_id: budgetData.categories.category_id,
          name: budgetData.categories.name,
          type: budgetData.categories.type,
          created_at: budgetData.categories.created_at,
          user_id: budgetData.categories.user_id,
          budgets: [],
        };
      }

      grouped[categoryId].budgets.push(budget.toJSON());
    }
    return Object.values(grouped);
  }

  async getBudgetsByCategory(userId, month, year) {
    return this.getBudgetsByPeriod(userId, month, year);
  }

  async getBudgetProgress(userId, budgetId) {
    const budget = await this.getByUserAndId(userId, budgetId);

    const budgetCriteria = {
      start_date: budget.start_date.toISOString(),
      end_date: budget.end_date.toISOString(),
      account_id: budget.account_id,
      category_id: budget.category_id,
      include_income: budget.include_income,
      include_transfers: budget.include_transfers,
    };

    const transactions =
      await this.transactionRepository.findForBudgetCalculation(
        userId,
        budgetCriteria
      );

    const spent = transactions.reduce((total, transaction) => {
      return total + parseFloat(transaction.amount);
    }, 0);

    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;

    return {
      budget: budget.toJSON(),
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
      isOverBudget: spent > budget.amount,
    };
  }

  async getBudgetAlerts(userId) {
    const budgets = await this.budgetRepository.findActiveBudgets(userId);
    const alerts = [];

    for (const budgetData of budgets) {
      const budget = new Budget(budgetData);

      const budgetCriteria = {
        start_date: budget.start_date.toISOString(),
        end_date: budget.end_date.toISOString(),
        account_id: budget.account_id,
        category_id: budget.category_id,
        include_income: budget.include_income,
        include_transfers: budget.include_transfers,
      };

      const transactions =
        await this.transactionRepository.findForBudgetCalculation(
          userId,
          budgetCriteria
        );

      const spent = transactions.reduce((total, transaction) => {
        return total + parseFloat(transaction.amount);
      }, 0);

      const remaining = budget.amount - spent;
      const percentage = (spent / budget.amount) * 100;

      if (percentage >= 80) {
        alerts.push({
          budget_id: budget.budget_id,
          name: budget.name,
          category: budget.category_id,
          amount: budget.amount,
          spent,
          remaining,
          percentage,
          status: percentage >= 100 ? "exceeded" : "warning",
        });
      }
    }

    return alerts;
  }
}
