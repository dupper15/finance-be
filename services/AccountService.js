import { BaseService } from '../core/BaseService.js';
import { Account } from '../models/Account.js';
import { NotFoundError } from '../core/NotFoundError.js';

export class AccountService extends BaseService {
    constructor(accountRepository) {
        super(accountRepository, Account);
        this.accountRepository = accountRepository;
    }

    async getByUserId(userId, includeInactive = false) {
        const accounts = await this.accountRepository.findByUserId(userId, includeInactive);
        return accounts.map(account => new Account(account));
    }

    async getByUserAndId(userId, accountId) {
        
        const account = await this.accountRepository.findByUserAndId(userId, accountId);
        if (!account) {
            throw new NotFoundError('Account not found');
        }
        return new Account(account);
    }

    async create(userId, accountData) {
        const data = { ...accountData, user_id: userId };
        return super.create(data);
    }

    async update(userId, accountId, accountData) {
        // Verify ownership
        await this.getByUserAndId(userId, accountId);
        
        const updatedAccount = await this.accountRepository.update(accountId, accountData);
        return new Account(updatedAccount);
    }

    async delete(userId, accountId) {
        // Verify ownership
        await this.getByUserAndId(userId, accountId);
        
        const deletedAccount = await this.accountRepository.softDelete(accountId);
        return new Account(deletedAccount);
    }

    async getBalanceHistory(userId, accountId, days = 30) {
        // Verify ownership
        await this.getByUserAndId(userId, accountId);
        
        const transactions = await this.accountRepository.getBalanceHistory(accountId, userId, days);
        
        // Calculate running balance
        let runningBalance = 0;
        return transactions.map(transaction => {
            if (transaction.transaction_type === 'income') {
                runningBalance += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === 'expense') {
                runningBalance -= parseFloat(transaction.amount);
            }

            return {
                date: transaction.transaction_date,
                balance: runningBalance
            };
        });
    }

    async getTotalBalance(userId) {
        const accounts = await this.getByUserId(userId);
        return accounts.reduce((total, account) => total + account.balance, 0);
    }

    async getBalanceByType(userId) {
        const accounts = await this.getByUserId(userId);
        const balanceByType = {};

        accounts.forEach(account => {
            if (!balanceByType[account.account_type]) {
                balanceByType[account.account_type] = {
                    count: 0,
                    totalBalance: 0
                };
            }
            balanceByType[account.account_type].count++;
            balanceByType[account.account_type].totalBalance += account.balance;
        });

        return balanceByType;
    }
}
