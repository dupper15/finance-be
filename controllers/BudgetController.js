import { BaseController } from "../core/BaseController.js";

export class BudgetController extends BaseController {
  constructor(budgetService) {
    super(null);
    this.budgetService = budgetService;
  }

  async getAll(req, res, next) {
    try {
      const { month, year, account_id } = req.query;
      console.log("3");
      console.log("fd", account_id);
      const user_id = req.user.id; // Get user_id from token
      console.log("Query Params:", user_id);
      // If month and year are provided, get budgets for specific period
      if (month && year) {
        const budgets = await this.budgetService.getBudgetsByPeriod(
          account_id,
          user_id,
          parseInt(month),
          parseInt(year)
        );
        return res.json(budgets);
      }

      const budgets = await this.budgetService.getByUserId(req.user.id);
      res.json(budgets.map((budget) => budget.toJSON()));
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      console.log("Fetching budget with ID:", req.params.id);
      console.log("User ID from token:", req.user.id);
      console.log("Request Params:", req.params);
      console.log("4");
      const budget = await this.budgetService.getByUserAndId(
        req.user.id,
        req.params.id
      );

      res.json(budget.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const budgetData = {
        ...req.body,
        user_id: req.user.id, // Ensure user_id from token
      };

      const budget = await this.budgetService.create(req.user.id, budgetData);

      res.status(201).json(budget.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      console.log("Updating budget with ID:", req.body);
      const updateData = {
        ...req.body,
        updated_at: new Date().toISOString(),
      };

      const budget = await this.budgetService.update(
        req.user.id,
        req.params.id,
        updateData
      );

      res.json(budget.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.budgetService.softDelete(
        req.user.id,
        req.params.id
      );

      res.json({
        success: true,
        message: "Đã xoá mềm ngân sách thành công",
        budget: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetProgress(req, res, next) {
    try {
      const progress = await this.budgetService.getBudgetProgress(
        req.user.id,
        req.params.id
      );

      res.json(progress);
    } catch (error) {
      next(error);
    }
  }

  async getBudgetsByCategory(req, res, next) {
    try {
      const { month, year } = req.query;
      const budgetsByCategory = await this.budgetService.getBudgetsByCategory(
        req.user.id,
        parseInt(month),
        parseInt(year)
      );

      res.json(budgetsByCategory);
    } catch (error) {
      next(error);
    }
  }
}
