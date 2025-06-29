import {BaseService} from '../core/BaseService.js';
import {ScheduledTransaction} from '../models/ScheduledTransaction.js';
import {NotFoundError} from '../core/NotFoundError.js';

export class ScheduledTransactionService extends BaseService {
    constructor(scheduledTransactionRepository, transactionRepository) {
        super(scheduledTransactionRepository, ScheduledTransaction);
        this.scheduledTransactionRepository = scheduledTransactionRepository;
        this.transactionRepository = transactionRepository;
    }

    async getByUserId(userId) {
        const scheduled = await this.scheduledTransactionRepository.findByUserId(userId);
        return scheduled.map(item => new ScheduledTransaction(item));
    }

    async getByUserAndId(userId, scheduledId) {
        const scheduled = await this.scheduledTransactionRepository.findByUserAndId(userId, scheduledId);
        if (!scheduled) {
            throw new NotFoundError('Scheduled transaction not found');
        }
        return new ScheduledTransaction(scheduled);
    }

    async create(userId, scheduledData) {
        const data = {
            ...scheduledData,
            user_id: userId,
            remaining_installments: scheduledData.schedule_type === 'installment' ? scheduledData.num_installments : null
        };
        return super.create(data);
    }

    async update(userId, scheduledId, scheduledData) {
        await this.getByUserAndId(userId, scheduledId);

        const data = {
            ...scheduledData,
            remaining_installments: scheduledData.schedule_type === 'installment' ? scheduledData.num_installments : null
        };

        const updated = await this.scheduledTransactionRepository.update(scheduledId, data);
        return new ScheduledTransaction(updated);
    }

    async delete(userId, scheduledId) {
        await this.getByUserAndId(userId, scheduledId);
        return await this.scheduledTransactionRepository.delete(scheduledId);
    }

    async toggleActive(userId, scheduledId) {
        const scheduled = await this.getByUserAndId(userId, scheduledId);

        const updated = await this.scheduledTransactionRepository.update(scheduledId, {
            is_active: !scheduled.is_active
        });

        return new ScheduledTransaction(updated);
    }

    async getUpcoming(userId, daysAhead = 7) {
        const upcoming = await this.scheduledTransactionRepository.findUpcoming(userId, daysAhead);

        return upcoming.map(transaction => ({
            type: 'upcoming_transaction',
            scheduled_id: transaction.scheduled_id,
            description: transaction.description,
            amount: parseFloat(transaction.amount),
            due_date: transaction.next_due_date,
            account_name: transaction.accounts?.name || 'Unknown Account',
            transfer_account_name: transaction.transfer_accounts?.name || null,
            transaction_type: transaction.transaction_type
        }));
    }

    async processDueTransactions() {
        const dueTransactions = await this.scheduledTransactionRepository.findDueTransactions();
        const processedTransactions = [];

        for (const scheduledTransaction of dueTransactions) {
            try {
                const transactionData = {
                    account_id: scheduledTransaction.account_id,
                    description: scheduledTransaction.description,
                    amount: scheduledTransaction.amount,
                    transaction_date: new Date().toISOString(),
                    transaction_type: scheduledTransaction.transaction_type,
                    category_id: scheduledTransaction.category_id,
                    tag_id: scheduledTransaction.tag_id,
                    memo: `Auto-generated from scheduled transaction: ${scheduledTransaction.description}`,
                    transfer_account_id: scheduledTransaction.transfer_account_id
                };

                const createdTransaction = await this.transactionRepository.create(transactionData);
                processedTransactions.push(createdTransaction);

                const nextDueDate = this.calculateNextDueDate(scheduledTransaction);
                if (nextDueDate) {
                    if (scheduledTransaction.schedule_type === 'installment') {
                        const remaining = scheduledTransaction.remaining_installments - 1;
                        if (remaining > 0) {
                            await this.scheduledTransactionRepository.update(scheduledTransaction.scheduled_id, {
                                next_due_date: nextDueDate,
                                remaining_installments: remaining
                            });
                        } else {
                            await this.scheduledTransactionRepository.update(scheduledTransaction.scheduled_id, {
                                is_active: false
                            });
                        }
                    } else {
                        await this.scheduledTransactionRepository.update(scheduledTransaction.scheduled_id, {
                            next_due_date: nextDueDate
                        });
                    }
                } else {
                    await this.scheduledTransactionRepository.update(scheduledTransaction.scheduled_id, {
                        is_active: false
                    });
                }

            } catch (error) {
                console.error(`Error processing scheduled transaction ${scheduledTransaction.scheduled_id}:`, error);
            }
        }

        return processedTransactions;
    }

    calculateNextDueDate(scheduledTransaction) {
        const currentDate = new Date(scheduledTransaction.next_due_date);

        switch (scheduledTransaction.frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'quarterly':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                return null;
        }

        return currentDate.toISOString();
    }
}