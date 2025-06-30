import { BaseController } from "../core/BaseController.js";

export class AccountController extends BaseController {
  constructor(accountService) {
    super(null); // We'll override methods to use the service directly
    this.accountService = accountService;
  }

  async getAll(req, res, next) {
    try {
      const accounts = await this.accountService.getByUserId(req.user.id);

      res.json(accounts.map((account) => account.toJSON()));
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const account = await this.accountService.getByUserAndId(
        req.user.id,
        req.params.id
      );

      res.json(account.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async getByUserId(req, res, next) {
    try {
      const accounts = await this.accountService.getByUserId(req.user.id);

      const jsonAccounts = accounts.map((account) => {
        return {
          account_id: account.account_id,
          name: account.name,
          account_type: account.account_type,
          balance: account.balance,
          user_id: account.user_id,
          is_active: account.is_active,
          created_at: account.created_at,
          updated_at: account.updated_at,
        };
      });

      res.json(jsonAccounts);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const account = await this.accountService.create(req.user.id, req.body);

      res.status(201).json(account.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const account = await this.accountService.update(
        req.user.id,
        req.params.id,
        req.body
      );

      res.json(account.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.accountService.delete(req.user.id, req.params.id);

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getBalanceHistory(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const history = await this.accountService.getBalanceHistory(
        req.user.id,
        req.params.id,
        parseInt(days)
      );

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}
