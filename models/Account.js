export class Account {
    constructor(data) {
        this.account_id = data.account_id;
        this.name = data.name;
        this.account_type = data.account_type;
        this.balance = parseFloat(data.balance || 0);
        this.user_id = data.user_id;
        this.is_active = data.is_active !== false;
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    validate() {
        const errors = [];
        const validTypes = ['checking', 'savings', 'credit_card', 'investment', 'cash', 'loan'];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Account name is required');
        }
        if (!validTypes.includes(this.account_type)) {
            errors.push('Invalid account type');
        }
        if (this.balance < 0 && !['credit_card', 'loan'].includes(this.account_type)) {
            errors.push('Balance cannot be negative for this account type');
        }

        return errors;
    }

    toDatabase() {
        return {
            name: this.name,
            account_type: this.account_type,
            balance: this.balance,
            user_id: this.user_id,
            is_active: this.is_active
        };
    }

    toJSON() {
        return {
            account_id: this.account_id,
            name: this.name,
            account_type: this.account_type,
            balance: this.balance,
            is_active: this.is_active,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }
}
