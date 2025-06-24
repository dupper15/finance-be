export class Budget {
    constructor(data) {
        this.budget_id = data.budget_id;
        this.name = data.name;
        this.amount = parseFloat(data.amount);
        this.duration = data.duration;
        this.start_date = new Date(data.start_date);
        this.end_date = new Date(data.end_date);
        this.account_id = data.account_id;
        this.category_id = data.category_id;
        this.include_subcategories = data.include_subcategories || false;
        this.include_transfers = data.include_transfers || false;
        this.include_deposits = data.include_deposits || false;
        this.include_income = data.include_income || false;
        this.user_id = data.user_id;
        this.is_active = data.is_active !== false;
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    validate() {
        const errors = [];
        const validDurations = ['weekly', 'monthly', 'quarterly', 'yearly'];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Budget name is required');
        }
        if (!this.amount || this.amount <= 0) {
            errors.push('Budget amount must be positive');
        }
        if (!validDurations.includes(this.duration)) {
            errors.push('Invalid budget duration');
        }
        if (this.end_date <= this.start_date) {
            errors.push('End date must be after start date');
        }

        return errors;
    }

    toDatabase() {
        return {
            name: this.name,
            amount: this.amount,
            duration: this.duration,
            start_date: this.start_date.toISOString().split('T')[0],
            end_date: this.end_date.toISOString().split('T')[0],
            account_id: this.account_id || null,
            category_id: this.category_id || null,
            include_subcategories: this.include_subcategories,
            include_transfers: this.include_transfers,
            include_deposits: this.include_deposits,
            include_income: this.include_income,
            user_id: this.user_id,
            is_active: this.is_active
        };
    }

    toJSON() {
        return {
            budget_id: this.budget_id,
            name: this.name,
            amount: this.amount,
            duration: this.duration,
            start_date: this.start_date.toISOString().split('T')[0],
            end_date: this.end_date.toISOString().split('T')[0],
            account_id: this.account_id,
            category_id: this.category_id,
            include_subcategories: this.include_subcategories,
            include_transfers: this.include_transfers,
            include_deposits: this.include_deposits,
            include_income: this.include_income,
            is_active: this.is_active,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }
}
