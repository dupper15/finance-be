export class Transaction {
    constructor(data = {}) {
        this.transaction_id = data.transaction_id;
        this.account_id = data.account_id;
        this.description = data.description;
        this.amount = parseFloat(data.amount || 0);
        this.transaction_date = new Date(data.transaction_date || new Date());
        this.transaction_type = data.transaction_type;
        this.category_id = data.category_id;
        this.tag_id = data.tag_id;
        this.memo = data.memo;
        this.is_split = data.is_split || false;
        this.transfer_account_id = data.transfer_account_id;
        this.user_id = data.user_id;
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    validate() {
        const errors = [];
        const validTypes = ['income', 'expense', 'transfer'];

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
        if (!this.transaction_date) {
            errors.push('Transaction date is required');
        }
        if (!validTypes.includes(this.transaction_type)) {
            errors.push('Invalid transaction type');
        }
        if (this.transaction_type === 'transfer' && !this.transfer_account_id) {
            errors.push('Transfer account is required for transfer transactions');
        }
        if (this.transaction_type === 'transfer' && this.transfer_account_id === this.account_id) {
            errors.push('Transfer account cannot be the same as source account');
        }
        if (!this.user_id) {
            errors.push('User ID is required');
        }
        if (this.memo && this.memo.length > 1000) {
            errors.push('Memo must be less than 1000 characters');
        }

        return errors;
    }

    toDatabase() {
        return {
            account_id: this.account_id,
            description: this.description,
            amount: this.amount,
            transaction_date: this.transaction_date.toISOString(),
            transaction_type: this.transaction_type,
            category_id: this.category_id || null,
            tag_id: this.tag_id || null,
            memo: this.memo || null,
            is_split: this.is_split,
            transfer_account_id: this.transfer_account_id || null,
            user_id: this.user_id
        };
    }

    toJSON() {
        return {
            transaction_id: this.transaction_id,
            account_id: this.account_id,
            description: this.description,
            amount: this.amount,
            transaction_date: this.transaction_date.toISOString(),
            transaction_type: this.transaction_type,
            category_id: this.category_id,
            tag_id: this.tag_id,
            memo: this.memo,
            is_split: this.is_split,
            transfer_account_id: this.transfer_account_id,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }

    static getValidTypes() {
        return ['income', 'expense', 'transfer'];
    }
}
