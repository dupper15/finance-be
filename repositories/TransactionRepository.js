import { BaseRepository } from "../core/BaseRepository.js";

export class TransactionRepository extends BaseRepository {
  constructor(database) {
    super(database, "transactions");
  }

  async findByUserId(userId, filters = {}, options = {}) {
    let query = this.db
      .from(this.tableName)
      .select(
        `
                *,
                accounts!transactions_account_id_fkey(name, account_type),
                transfer_accounts:accounts!transactions_transfer_account_id_fkey(name, account_type),
                categories(name),
                tags(name)
            `
      )
      .eq("user_id", userId);

    if (filters.account_id) query = query.eq("account_id", filters.account_id);
    if (filters.category_id)
      query = query.eq("category_id", filters.category_id);
    if (filters.transaction_type)
      query = query.eq("transaction_type", filters.transaction_type);
    if (filters.start_date)
      query = query.gte("transaction_date", filters.start_date);
    if (filters.end_date)
      query = query.lte("transaction_date", filters.end_date);
    if (filters.search)
      query = query.ilike("description", `%${filters.search}%`);

    query = query.order("transaction_date", { ascending: false });

    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  }
  async getByUserAndAccountId(userId, accoundId) {
    console.log(
      "Finding transaction for user2:",
      userId,
      "with ID:",
      accoundId
    );
    console.log(
      "Finding transaction for user9:",
      userId,
      "with ID:",
      accoundId
    );
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data, error } = await this.db
      .from(this.tableName)
      .select(
        `
            *,
            categories:category_id (
                category_id,
                name,
                type,
                is_default,
                is_delete
            )
        `
      )
      .eq("user_id", userId)
      .eq("account_id", accoundId);

    if (error) throw error;

    console.log("Transaction found:", data);
    return data;
  }
  async getByAccountIds(accountIds, month, year) {
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      throw new Error("accountIds phải  là mảng có ít nhất 1 phần tử");
    }
    if (typeof month !== "number" || month < 1 || month > 12) {
      throw new Error("month phải là số trong khoảng 1-12");
    }
    if (typeof year !== "number" || year < 1900) {
      throw new Error("year không hợp lệ");
    }

    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();

    const { data, error } = await this.db
      .from(this.tableName)
      .select("*")
      .in("account_id", accountIds)
      .gte("transaction_date", startDate)
      .lt("transaction_date", endDate);

    if (error) throw error;
    return data;
  }

  async findByUserAndId(userId, transactionId) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(
        `
                *,
                accounts!transactions_account_id_fkey(name, account_type),
                transfer_accounts:accounts!transactions_transfer_account_id_fkey(name, account_type),
                categories(name),
                tags(name),
                split_transactions(*)
            `
      )
      .eq("user_id", userId)
      .eq("transaction_id", transactionId)
      .single();

    if (error) throw error;
    return data;
  }

  async getStatsSummary(userId, startDate = null, endDate = null) {
    let query = this.db
      .from(this.tableName)
      .select("amount, transaction_type")
      .eq("user_id", userId);

    if (startDate) query = query.gte("transaction_date", startDate);
    if (endDate) query = query.lte("transaction_date", endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findForBudgetCalculation(userId, budgetCriteria) {
    let query = this.db
      .from(this.tableName)
      .select("amount, transaction_type")
      .eq("user_id", userId)
      .gte("transaction_date", budgetCriteria.start_date)
      .lte("transaction_date", budgetCriteria.end_date);

    if (budgetCriteria.account_id) {
      query = query.eq("account_id", budgetCriteria.account_id);
    }

    if (budgetCriteria.category_id) {
      query = query.eq("category_id", budgetCriteria.category_id);
    }

    if (!budgetCriteria.include_income) {
      query = query.neq("transaction_type", "income");
    }

    if (!budgetCriteria.include_transfers) {
      query = query.neq("transaction_type", "transfer");
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  getPrimaryKey() {
    return "transaction_id";
  }
}
