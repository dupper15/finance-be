import { BaseRepository } from '../core/BaseRepository.js';

export class TwoFactorAuthRepository extends BaseRepository {
    constructor(database) {
        super(database, 'user_two_factor_auth');
    }

    async findByUserId(userId) {
        try {
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Error finding 2FA record by user ID:', error);
            return null;
        }
    }

    async createForUser(userId, secretKey, backupCodes = []) {
        try {
            const { data, error } = await this.db
                .from(this.tableName)
                .insert({
                    user_id: userId,
                    secret_key: secretKey,
                    backup_codes: backupCodes,
                    is_enabled: false
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating 2FA record:', error);
            throw error;
        }
    }

    async enableTwoFactor(userId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .update({
                is_enabled: true,
                verified_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async disableTwoFactor(userId) {
        const { data, error } = await this.db
            .from(this.tableName)
            .update({
                is_enabled: false,
                verified_at: null
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateBackupCodes(userId, backupCodes) {
        const { data, error } = await this.db
            .from(this.tableName)
            .update({
                backup_codes: backupCodes
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async logAttempt(userId, token, isSuccessful, ipAddress = null, userAgent = null) {
        const { data, error } = await this.db
            .from('two_factor_attempts')
            .insert({
                user_id: userId,
                token_used: token,
                is_successful: isSuccessful,
                ip_address: ipAddress,
                user_agent: userAgent
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getRecentAttempts(userId, timeWindow = 300) {
        const cutoffTime = new Date(Date.now() - timeWindow * 1000).toISOString();

        const { data, error } = await this.db
            .from('two_factor_attempts')
            .select('*')
            .eq('user_id', userId)
            .gte('attempt_time', cutoffTime)
            .order('attempt_time', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async deleteByUserId(userId) {
        const { error } = await this.db
            .from(this.tableName)
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    }

    getPrimaryKey() {
        return 'id';
    }
}