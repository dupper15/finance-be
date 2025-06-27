export class Tag {
    constructor(data = {}) {
        this.tag_id = data.tag_id;
        this.name = data.name;
        this.description = data.description;
        this.color = data.color;
        this.user_id = data.user_id;
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Tag name is required');
        }
        if (this.name && this.name.length > 100) {
            errors.push('Tag name must be less than 100 characters');
        }
        if (this.description && this.description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
        if (this.color && !/^#[0-9A-Fa-f]{6}$/.test(this.color)) {
            errors.push('Color must be a valid hex color');
        }
        if (!this.user_id) {
            errors.push('User ID is required');
        }

        return errors;
    }

    toDatabase() {
        return {
            name: this.name,
            description: this.description || null,
            color: this.color || null,
            user_id: this.user_id
        };
    }

    toJSON() {
        return {
            tag_id: this.tag_id,
            name: this.name,
            description: this.description,
            color: this.color,
            user_id: this.user_id,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }
}
