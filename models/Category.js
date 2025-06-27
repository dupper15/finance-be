export class Category {
    constructor(data = {}) {
        this.category_id = data.category_id;
        this.name = data.name;
        this.description = data.description;
        this.color = data.color;
        this.parent_category_id = data.parent_category_id;
        this.user_id = data.user_id;
        this.is_default = data.is_default || false;
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Category name is required');
        }
        if (this.name && this.name.length > 100) {
            errors.push('Category name must be less than 100 characters');
        }
        if (this.description && this.description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
        if (this.color && !/^#[0-9A-Fa-f]{6}$/.test(this.color)) {
            errors.push('Color must be a valid hex color');
        }
        if (!this.is_default && !this.user_id) {
            errors.push('User ID is required for user categories');
        }

        return errors;
    }

    toDatabase() {
        return {
            name: this.name,
            description: this.description || null,
            color: this.color || null,
            parent_category_id: this.parent_category_id || null,
            user_id: this.user_id || null,
            is_default: this.is_default
        };
    }

    toJSON() {
        return {
            category_id: this.category_id,
            name: this.name,
            description: this.description,
            color: this.color,
            parent_category_id: this.parent_category_id,
            user_id: this.user_id,
            is_default: this.is_default,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }
}
