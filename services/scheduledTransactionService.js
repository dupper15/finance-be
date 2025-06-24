import { supabase } from '../config/database.js';

export const processScheduledTransactions = async () => {
    try {
        const now = new Date();

        // Get all active scheduled transactions that are due
        const { data: scheduledTransactions, error } = await supabase
            .from('scheduled_transactions')
            .select('*')
            .eq('is_active', true)
            .lte('next_due_date', now.toISOString());

        if (error) throw error;

        for (const scheduled of scheduledTransactions) {
            // Create the transaction
            const transactionData = {
                account_id: scheduled.account_id,
                description: scheduled.description,
                amount: scheduled.amount,
                transaction_date: scheduled.next_due_date,
                transaction_type: scheduled.transaction_type,
                category_id: scheduled.category_id,
                user_id: scheduled.user_id,
                transfer_account_id: scheduled.transfer_account_id,
                scheduled_transaction_id: scheduled.scheduled_id
            };

            const { error: insertError } = await supabase
                .from('transactions')
                .insert([transactionData]);

            if (insertError) {
                console.error('Error creating scheduled transaction:', insertError);
                continue;
            }

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
                    // Calculate next due date based on frequency
                    nextDueDate = calculateNextDueDate(nextDueDate, scheduled.frequency);
                }
            } else if (scheduled.schedule_type === 'recurring') {
                nextDueDate = calculateNextDueDate(nextDueDate, scheduled.frequency);

                // Check if end date is reached
                if (scheduled.end_date && nextDueDate > new Date(scheduled.end_date)) {
                    shouldDeactivate = true;
                }
            }

            // Update scheduled transaction
            const updateData = {
                last_executed: now.toISOString(),
                ...(shouldDeactivate ? { is_active: false } : { next_due_date: nextDueDate.toISOString() }),
                ...(scheduled.schedule_type === 'installment' && !shouldDeactivate ? {
                    remaining_installments: scheduled.remaining_installments - 1
                } : {})
            };

            await supabase
                .from('scheduled_transactions')
                .update(updateData)
                .eq('scheduled_id', scheduled.scheduled_id);
        }

        return { processed: scheduledTransactions.length };
    } catch (error) {
        console.error('Error processing scheduled transactions:', error);
        throw error;
    }
};

const calculateNextDueDate = (currentDate, frequency) => {
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
};
