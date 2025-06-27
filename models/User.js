export class User {
    constructor(data = {}) {
        this.user_id = data.user_id || data.id;
        this.email = data.email;
        this.name = data.name || data.user_metadata?.name;
        this.phone = data.phone || data.user_metadata?.phone;
        this.email_confirmed_at = data.email_confirmed_at ? new Date(data.email_confirmed_at) : null;
        this.preferences = {
            currency: data.preferences?.currency || data.user_metadata?.preferences?.currency || 'VND',
            language: data.preferences?.language || data.user_metadata?.preferences?.language || 'vi',
            timezone: data.preferences?.timezone || data.user_metadata?.preferences?.timezone || 'Asia/Ho_Chi_Minh',
            notifications: {
                email: data.preferences?.notifications?.email || data.user_metadata?.preferences?.notifications?.email || true,
                budget_alerts: data.preferences?.notifications?.budget_alerts || data.user_metadata?.preferences?.notifications?.budget_alerts || true,
                transaction_reminders: data.preferences?.notifications?.transaction_reminders || data.user_metadata?.preferences?.notifications?.transaction_reminders || true
            }
        };
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
        this.last_sign_in_at = data.last_sign_in_at ? new Date(data.last_sign_in_at) : null;
    }

    validate() {
        const errors = [];

        if (!this.email) {
            errors.push('Email is required');
        }
        if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            errors.push('Invalid email format');
        }
        if (!this.name || this.name.trim().length === 0) {
            errors.push('Name is required');
        }
        if (this.name && this.name.length > 255) {
            errors.push('Name must be less than 255 characters');
        }
        if (this.phone && !/^[+]?[\d\s\-()]+$/.test(this.phone)) {
            errors.push('Invalid phone number format');
        }

        const validCurrencies = ['VND', 'USD', 'EUR'];
        if (!validCurrencies.includes(this.preferences.currency)) {
            errors.push('Invalid currency preference');
        }

        const validLanguages = ['vi', 'en'];
        if (!validLanguages.includes(this.preferences.language)) {
            errors.push('Invalid language preference');
        }

        return errors;
    }

    toDatabase() {
        return {
            name: this.name,
            phone: this.phone,
            preferences: this.preferences
        };
    }

    toJSON() {
        return {
            user_id: this.user_id,
            email: this.email,
            name: this.name,
            phone: this.phone,
            email_confirmed_at: this.email_confirmed_at?.toISOString() || null,
            preferences: this.preferences,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString(),
            last_sign_in_at: this.last_sign_in_at?.toISOString() || null
        };
    }

    static getValidCurrencies() {
        return ['VND', 'USD', 'EUR'];
    }

    static getValidLanguages() {
        return ['vi', 'en'];
    }
}