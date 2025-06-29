import { BaseController } from "../core/BaseController.js";

export class TransactionController extends BaseController {
  constructor(transactionService) {
    super(null);
    this.transactionService = transactionService;
  }

  async getAll(req, res, next) {
    try {
      const {
        account_id,
        category_id,
        transaction_type,
        start_date,
        end_date,
        page = 1,
        limit = 50,
        search,
      } = req.query;

      const filters = {
        account_id,
        category_id,
        transaction_type,
        start_date,
        end_date,
        search,
      };

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      };

      const result = await this.transactionService.getByUserId(
        req.user.id,
        filters,
        options
      );

      res.json({
        transactions: result.data.map((tx) => tx.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    console.log("Fetching transaction by ID:", req.params.id);
    try {
      const transaction = await this.transactionService.getByUserAndId(
        req.user.id,
        req.params.id
      );
      console.log("Transaction:", transaction);
      res.json(transaction.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async getByUserAndAccountId(req, res, next) {
    console.log("Fetching transaction by ID:", req.params.id);
    try {
      const transaction = await this.transactionService.getByUserAndAccountId(
        req.user.id,
        req.params.id
      );
      return res.json(transaction);
    } catch (error) {
      next(error);
    }
  }

  async getByAccountIds(req, res, next) {
    try {
      const { accountIds, month, year } = req.body;
      if (!accountIds || !month || !year) {
        return res
          .status(400)
          .json({ error: "Missing required query parameters" });
      }

      const transactions = await this.transactionService.getByAccountIds(
        accountIds,
        month,
        year
      );

      res.json(transactions.map((tx) => tx.toJSON()));
    } catch (error) {
      next(error);
    }
  }
  async create(req, res, next) {
    try {
      const transaction = await this.transactionService.create(
        req.user.id,
        req.body
      );

      res.status(201).json(transaction.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const transaction = await this.transactionService.update(
        req.user.id,
        req.params.id,
        req.body
      );

      res.json(transaction.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.transactionService.delete(req.user.id, req.params.id);

      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getStatsSummary(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const summary = await this.transactionService.getStatsSummary(
        req.user.id,
        start_date,
        end_date
      );

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
}
