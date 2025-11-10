// Service für Two-Factor Authentication
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '../lib/prisma.singleton';
import logger from '../lib/logger';

export class TwoFactorService {
  /**
   * Generiere 2FA Secret für User
   */
  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `CraftHost Pro (${email})`,
      issuer: 'CraftHost Pro',
      length: 32,
    });

    // Speichere Secret temporär (nicht aktiviert)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false, // Noch nicht aktiviert
      },
    });

    // Generiere QR Code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    logger.info('2FA secret generated', { userId });

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verifiziere 2FA Token und aktiviere 2FA
   */
  async verifyAndEnable(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA secret not found. Generate secret first.');
    }

    // Verifiziere Token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time windows (60s before/after)
    });

    if (!verified) {
      throw new Error('Invalid 2FA token');
    }

    // Aktiviere 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    // Generiere Backup Codes
    const backupCodes = await this.generateBackupCodes(userId);

    logger.info('2FA enabled for user', { userId });

    return {
      success: true,
      backupCodes, // User sollte diese sicher speichern!
    };
  }

  /**
   * Verifiziere 2FA Token beim Login
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA not enabled for this user');
    }

    // Prüfe normalen TOTP Token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      logger.info('2FA token verified', { userId });
      return true;
    }

    // Prüfe Backup Code
    const isBackupCode = await this.verifyBackupCode(userId, token);
    if (isBackupCode) {
      logger.info('2FA backup code used', { userId });
      return true;
    }

    logger.warn('2FA verification failed', { userId });
    return false;
  }

  /**
   * Generiere Backup Codes
   */
  async generateBackupCodes(userId: string, count: number = 10): Promise<string[]> {
    // Lösche alte Backup Codes
    await prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });

    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);

      await prisma.twoFactorBackupCode.create({
        data: {
          userId,
          code,
        },
      });
    }

    logger.info('Backup codes generated', { userId, count });
    return codes;
  }

  /**
   * Verifiziere Backup Code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const backupCode = await prisma.twoFactorBackupCode.findFirst({
      where: {
        userId,
        code: code.toUpperCase(),
        used: false,
      },
    });

    if (!backupCode) {
      return false;
    }

    // Markiere Code als verwendet
    await prisma.twoFactorBackupCode.update({
      where: { id: backupCode.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    logger.info('Backup code used', { userId, codeId: backupCode.id });
    return true;
  }

  /**
   * Deaktiviere 2FA
   */
  async disable(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // Lösche Backup Codes
    await prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });

    logger.info('2FA disabled for user', { userId });
  }

  /**
   * Prüfe ob User 2FA aktiviert hat
   */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled || false;
  }

  /**
   * Hole verbleibende Backup Codes
   */
  async getRemainingBackupCodes(userId: string): Promise<number> {
    const count = await prisma.twoFactorBackupCode.count({
      where: {
        userId,
        used: false,
      },
    });

    return count;
  }
}

export default new TwoFactorService();
