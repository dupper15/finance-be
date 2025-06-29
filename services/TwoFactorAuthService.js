import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { TwoFactorAuth } from '../models/TwoFactorAuth.js';
import { ValidationError } from '../core/ValidationError.js';
import { UnauthorizedError } from '../core/UnauthorizedError.js';
import { NotFoundError } from '../core/NotFoundError.js';

export class TwoFactorAuthService {
    constructor(twoFactorAuthRepository) {
        this.twoFactorAuthRepository = twoFactorAuthRepository;
        this.maxAttempts = 5;
        this.timeWindow = 300;
    }

    generateSecret() {
        const secret = speakeasy.generateSecret({
            name: 'Controle Finance',
            length: 32
        });
        return secret.base32;
    }

    generateTOTP(secret) {
        return speakeasy.totp({
            secret: secret,
            encoding: 'base32',
            time: Date.now() / 1000,
            step: 30,
            digits: 6
        });
    }

    verifyTOTP(secret, token, window = 1) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            time: Date.now() / 1000,
            step: 30,
            window: window
        });
    }

    generateQRCodeUrl(secret, userEmail, appName = 'Controle Finance') {
        const otpAuthUrl = speakeasy.otpauthURL({
            secret: secret,
            label: `${appName}:${userEmail}`,
            issuer: appName,
            encoding: 'base32'
        });
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
    }

    async generateQRCodeBase64(secret, userEmail, appName = 'Controle Finance') {
        const otpAuthUrl = speakeasy.otpauthURL({
            secret: secret,
            label: `${appName}:${userEmail}`,
            issuer: appName,
            encoding: 'base32'
        });

        try {
            const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
            return qrCodeDataUrl;
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw new Error('Failed to generate QR code');
        }
    }

    async setupTwoFactor(userId, userEmail) {
        const existing = await this.twoFactorAuthRepository.findByUserId(userId);
        if (existing && existing.is_enabled) {
            throw new ValidationError('Two-factor authentication is already enabled');
        }

        const secret = this.generateSecret();
        const backupCodes = TwoFactorAuth.generateBackupCodes();

        if (existing) {
            // Update existing record
            await this.twoFactorAuthRepository.update(existing.id, {
                secret_key: secret,
                backup_codes: backupCodes,
                is_enabled: false,
                verified_at: null
            });
        } else {
            // Create new record
            await this.twoFactorAuthRepository.createForUser(userId, secret, backupCodes);
        }

        const qrCodeUrl = this.generateQRCodeUrl(secret, userEmail);

        return {
            secret,
            qrCodeUrl,
            backupCodes
        };
    }

    async verifyAndEnable(userId, token) {
        const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(userId);
        if (!twoFactorAuth) {
            throw new NotFoundError('Two-factor authentication not set up');
        }

        if (twoFactorAuth.is_enabled) {
            throw new ValidationError('Two-factor authentication is already enabled');
        }

        const isValid = this.verifyTOTP(twoFactorAuth.secret_key, token);
        if (!isValid) {
            throw new UnauthorizedError('Invalid verification code');
        }

        await this.twoFactorAuthRepository.enableTwoFactor(userId);
        return new TwoFactorAuth(await this.twoFactorAuthRepository.findByUserId(userId));
    }

    async verifyToken(userId, token, ipAddress = null, userAgent = null) {
        const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(userId);
        if (!twoFactorAuth || !twoFactorAuth.is_enabled) {
            throw new NotFoundError('Two-factor authentication not enabled');
        }

        await this.checkRateLimit(userId);

        let isValid = false;
        let usedBackupCode = false;

        if (this.verifyTOTP(twoFactorAuth.secret_key, token)) {
            isValid = true;
        } else {
            const twoFactorAuthObj = new TwoFactorAuth(twoFactorAuth);
            if (twoFactorAuthObj.useBackupCode(token)) {
                isValid = true;
                usedBackupCode = true;
                await this.twoFactorAuthRepository.updateBackupCodes(
                    userId,
                    twoFactorAuthObj.backup_codes
                );
            }
        }

        await this.twoFactorAuthRepository.logAttempt(
            userId,
            token.substring(0, 2) + '****',
            isValid,
            ipAddress,
            userAgent
        );

        if (!isValid) {
            throw new UnauthorizedError('Invalid two-factor authentication code');
        }

        return {
            verified: true,
            usedBackupCode,
            remainingBackupCodes: usedBackupCode ?
                (await this.twoFactorAuthRepository.findByUserId(userId)).backup_codes.length :
                twoFactorAuth.backup_codes.length
        };
    }

    async disable(userId) {
        const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(userId);
        if (!twoFactorAuth) {
            throw new NotFoundError('Two-factor authentication not found');
        }

        await this.twoFactorAuthRepository.disableTwoFactor(userId);
        return { message: 'Two-factor authentication disabled successfully' };
    }

    async regenerateBackupCodes(userId) {
        const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(userId);
        if (!twoFactorAuth || !twoFactorAuth.is_enabled) {
            throw new NotFoundError('Two-factor authentication not enabled');
        }

        const newBackupCodes = TwoFactorAuth.generateBackupCodes();
        await this.twoFactorAuthRepository.updateBackupCodes(userId, newBackupCodes);

        return { backupCodes: newBackupCodes };
    }

    async getStatus(userId) {
        const twoFactorAuth = await this.twoFactorAuthRepository.findByUserId(userId);

        if (!twoFactorAuth) {
            return {
                isEnabled: false,
                isSetup: false,
                backupCodesCount: 0
            };
        }

        return {
            isEnabled: twoFactorAuth.is_enabled,
            isSetup: true,
            backupCodesCount: twoFactorAuth.backup_codes ? twoFactorAuth.backup_codes.length : 0,
            verifiedAt: twoFactorAuth.verified_at
        };
    }

    async checkRateLimit(userId) {
        const attempts = await this.twoFactorAuthRepository.getRecentAttempts(
            userId,
            this.timeWindow
        );

        const failedAttempts = attempts.filter(attempt => !attempt.is_successful);

        if (failedAttempts.length >= this.maxAttempts) {
            throw new UnauthorizedError(
                `Too many failed attempts. Please try again in ${this.timeWindow / 60} minutes.`
            );
        }
    }
}