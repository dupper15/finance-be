export class ScheduledTransaction {
    constructor(data = {}) {
        this.scheduled_id = data.scheduled_id;
        this.account_id = data.account_id;
        this.description = data.description;
        this.amount = parseFloat(data.amount || 0);
        this.next_due_date = new Date(data.next_due_date);
        this.schedule_type = data.schedule_type;
        this.frequency = data.frequency;
        this.num_installments = data.num_installments;
        this.remaining_installments = data.remaining_installments;
        this.transaction_type = data.transaction_type;
        this.category_id = data.category_id;
        this.transfer_account_id = data.transfer_account_id;
        this.end_date = data.end_date ? new Date(data.end_date) : null;
        this.last_executed = data.last_executed ? new Date(data.last_executed) : null;
        this.user_id = data.user_id;
        this.is_active = data.is_active !== false;
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    validate() {
        const errors = [];
        const validScheduleTypes = ['once', 'recurring', 'installment'];
        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        const validTransactionTypes = ['income', 'expense', 'transfer'];

        if (!this.account_id) {
            errors.push('Account ID is required');
        }
        if (!this.description || this.description.trim().length === 0) {
            errors.push('Description is required');
        }
        if (this.description && this.description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
        if (!this.amount || this.amount <= 0) {
            errors.push('Amount must be positive');
        }
        if (!this.next_due_date) {
            errors.push('Next due date is required');
        }
        if (!validScheduleTypes.includes(this.schedule_type)) {
            errors.push('Invalid schedule type');
        }
        if (['recurring', 'installment'].includes(this.schedule_type) && !validFrequencies.includes(this.frequency)) {
            errors.push('Frequency is required for recurring and installment schedules');
        }
        if (this.schedule_type === 'installment' && (!this.num_installments || this.num_installments <= 0)) {
            errors.push('Number of installments is required for installment schedules');
        }
        if (!validTransactionTypes.includes(this.transaction_type)) {
            errors.push('Invalid transaction type');
        }
        if (this.transaction_type === 'transfer' && !this.transfer_account_id) {
            errors.push('Transfer account is required for transfer transactions');
        }
        if (!this.user_id) {
            errors.push('User ID is required');
        }

        return errors;
    }

    toDatabase() {
        return {
            account_id: this.account_id,
            description: this.description,
            amount: this.amount,
            next_due_date: this.next_due_date.toISOString(),
            schedule_type: this.schedule_type,
            frequency: this.frequency || null,
            num_installments: this.num_installments || null,
            remaining_installments: this.remaining_installments || null,
            transaction_type: this.transaction_type,
            category_id: this.category_id || null,
            transfer_account_id: this.transfer_account_id || null,
            end_date: this.end_date ? this.end_date.toISOString() : null,
            last_executed: this.last_executed ? this.last_executed.toISOString() : null,
            user_id: this.user_id,
            is_active: this.is_active
        };
    }

    toJSON() {
        return {
            scheduled_id: this.scheduled_id,
            account_id: this.account_id,
            description: this.description,
            amount: this.amount,
            next_due_date: this.next_due_date.toISOString(),
            schedule_type: this.schedule_type,
            frequency: this.frequency,
            num_installments: this.num_installments,
            remaining_installments: this.remaining_installments,
            transaction_type: this.transaction_type,
            category_id: this.category_id,
            transfer_account_id: this.transfer_account_id,
            end_date: this.end_date ? this.end_date.toISOString() : null,
            last_executed: this.last_executed ? this.last_executed.toISOString() : null,
            is_active: this.is_active,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }

    static getValidScheduleTypes() {
        return ['once', 'recurring', 'installment'];
    }

    static getValidFrequencies() {
        return ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    }
}
