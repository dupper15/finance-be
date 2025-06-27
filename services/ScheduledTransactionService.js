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
        // Verify ownership
        await this.getByUserAndId(userId, scheduledId);

        const data = {
            ...scheduledData,
            remaining_installments: scheduledData.schedule_type === 'installment' ? scheduledData.num_installments : null
        };

        const updated = await this.scheduledTransactionRepository.update(scheduledId, data);
        return new ScheduledTransaction(updated);
    }

    async delete(userId, scheduledId) {
        // Verify ownership
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
            account_name: transaction.accounts.name,
            transaction_type: transaction.transaction_type,
            days_until_due: Math.ceil(
                (new Date(transaction.next_due_date) - new Date()) / (1000 * 60 * 60 * 24)
            )
        }));
    }

    async processDueTransactions() {
        const dueTransactions = await this.scheduledTransactionRepository.findDueTransactions();
        let processedCount = 0;

        for (const scheduledData of dueTransactions) {
            try {
                const scheduled = new ScheduledTransaction(scheduledData);

                // Create the transaction
                const transactionData = {
                    account_id: scheduled.account_id,
                    description: scheduled.description,
                    amount: scheduled.amount,
                    transaction_date: scheduled.next_due_date.toISOString(),
                    transaction_type: scheduled.transaction_type,
                    category_id: scheduled.category_id,
                    user_id: scheduled.user_id,
                    transfer_account_id: scheduled.transfer_account_id,
                    scheduled_transaction_id: scheduled.scheduled_id
                };

                await this.transactionRepository.create(transactionData);

                // Update the scheduled transaction for next occurrence
                let nextDueDate = new Date(scheduled.next_due_date);
                let shouldDeactivate = false;

                if (scheduled.schedule_type === 'once') {
                    shouldDeactivate = true;
                } else if (scheduled.schedule_type === 'installment') {
                    const remainingInstallments = scheduled.remaining_installments - 1;
                    if (remainingInstallments <= 0) {
                        shouldDeactivate = true;
                    } else {
                        nextDueDate = this.calculateNextDueDate(nextDueDate, scheduled.frequency);
                    }
                } else if (scheduled.schedule_type === 'recurring') {
                    nextDueDate = this.calculateNextDueDate(nextDueDate, scheduled.frequency);

                    if (scheduled.end_date && nextDueDate > scheduled.end_date) {
                        shouldDeactivate = true;
                    }
                }

                // Update scheduled transaction
                const updateData = {
                    last_executed: new Date().toISOString(),
                    ...(shouldDeactivate ? {is_active: false} : {next_due_date: nextDueDate.toISOString()}),
                    ...(scheduled.schedule_type === 'installment' && !shouldDeactivate ? {
                        remaining_installments: scheduled.remaining_installments - 1
                    } : {})
                };

                await this.scheduledTransactionRepository.update(scheduled.scheduled_id, updateData);
                processedCount++;

            } catch (error) {
                console.error('Error processing scheduled transaction:', error);
            }
        }

        return {processed: processedCount};
    }

    calculateNextDueDate(currentDate, frequency) {
        const nextDate = new Date(currentDate);

        switch (frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            default:
                nextDate.setMonth(nextDate.getMonth() + 1);
        }

        return nextDate;
    }
}
