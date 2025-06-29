export class TwoFactorAuth {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.secret_key = data.secret_key;
        this.is_enabled = data.is_enabled || false;
        this.backup_codes = data.backup_codes || [];
        this.created_at = data.created_at ? new Date(data.created_at) : new Date();
        this.updated_at = data.updated_at ? new Date(data.updated_at) : new Date();
        this.verified_at = data.verified_at ? new Date(data.verified_at) : null;
    }

    validate() {
        const errors = [];

        if (!this.user_id) {
            errors.push('User ID is required');
        }

        if (!this.secret_key) {
            errors.push('Secret key is required');
        }

        if (this.secret_key && (this.secret_key.length < 16 || this.secret_key.length > 128)) {
            errors.push('Secret key must be between 16 and 128 characters long');
        }

        if (this.backup_codes && !Array.isArray(this.backup_codes)) {
            errors.push('Backup codes must be an array');
        }

        if (this.backup_codes && this.backup_codes.length > 10) {
            errors.push('Maximum 10 backup codes allowed');
        }

        return errors;
    }

    toDatabase() {
        return {
            user_id: this.user_id,
            secret_key: this.secret_key,
            is_enabled: this.is_enabled,
            backup_codes: this.backup_codes,
            verified_at: this.verified_at
        };
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            is_enabled: this.is_enabled,
            backup_codes_count: this.backup_codes ? this.backup_codes.length : 0,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString(),
            verified_at: this.verified_at?.toISOString() || null
        };
    }

    toJSONWithSecret() {
        return {
            ...this.toJSON(),
            secret_key: this.secret_key,
            backup_codes: this.backup_codes
        };
    }

    static generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 8; i++) {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    useBackupCode(code) {
        const index = this.backup_codes.indexOf(code.toUpperCase());
        if (index > -1) {
            this.backup_codes.splice(index, 1);
            return true;
        }
        return false;
    }

    hasBackupCodes() {
        return this.backup_codes && this.backup_codes.length > 0;
    }
}