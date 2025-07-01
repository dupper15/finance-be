import express from "express";
import { authenticateToken } from "../middleware/AuthMiddleware.js";
import {
  validateRequest,
  budgetSchema,
} from "../middleware/ValidationMiddleware.js";

export class BudgetRoutes {
  constructor(container) {
    this.router = express.Router();
    this.controller = container.get("budgetController");
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.use(authenticateToken);

    // Get all budgets or budgets by period
    this.router.get("/", this.controller.getAll.bind(this.controller));

    // Get budget by ID
    this.router.get("/:id", this.controller.getById.bind(this.controller));

    // Create new budget
    this.router.post(
      "/",
      validateRequest(budgetSchema),
      this.controller.create.bind(this.controller)
    );

    // Update budget
    this.router.put(
      "/:id",
      validateRequest(budgetSchema),
      this.controller.update.bind(this.controller)
    );

    // Soft delete budget
    this.router.delete("/:id", this.controller.delete.bind(this.controller));

    // Get budget progress
    this.router.get(
      "/:id/progress",
      this.controller.getBudgetProgress.bind(this.controller)
    );

    // Get budgets grouped by category
    this.router.get(
      "/by-category",
      this.controller.getBudgetsByCategory.bind(this.controller)
    );
  }

  getRouter() {
    return this.router;
  }
}
