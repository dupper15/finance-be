export class Category {
    constructor(data = {}) {
        this.category_id = data.category_id;
        this.name = data.name;
        this.type = data.type; // 'income' or 'expense'
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.user_id = data.user_id;
        this.is_default = data.is_default || false;
        this.is_delete = data.is_delete || false;
    }

    validate() {
        const errors = [];
        const validTypes = ['income', 'expense'];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Category name is required');
        }
        if (this.name && this.name.length > 100) {
            errors.push('Category name must be less than 100 characters');
        }
        if (!this.type || !validTypes.includes(this.type)) {
            errors.push('Category type is required and must be either "income" or "expense"');
        }
        if (!this.is_default && !this.user_id) {
            errors.push('User ID is required for user categories');
        }

        return errors;
    }

    toDatabase() {
        return {
            name: this.name,
            type: this.type,
            user_id: this.user_id || null,
            is_default: this.is_default,
            is_delete: this.is_delete
        };
    }

    toJSON() {
        return {
            category_id: this.category_id,
            name: this.name,
            type: this.type,
            created_at: this.created_at.toISOString(),
            user_id: this.user_id,
            is_default: this.is_default,
            is_delete: this.is_delete
        };
    }

    static getValidTypes() {
        return ['income', 'expense'];
    }
}