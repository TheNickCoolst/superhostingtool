import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export class TwoFactorService {
  // Generate 2FA secret
  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `CraftHost Pro (${email})`,
      length: 32,
    });

    // Check if 2FA already exists
    const existing = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update existing
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          secret: secret.base32,
          enabled: false, // Must be verified again
        },
      });
    } else {
      // Create new
      await prisma.twoFactorAuth.create({
        data: {
          userId,
          secret: secret.base32,
          backupCodes: this.generateBackupCodes(),
          enabled: false,
        },
      });
    }

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  // Verify and enable 2FA
  async verifyAndEnable(userId: string, token: string) {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      throw new Error('2FA not set up for this user');
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    // Enable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        enabled: true,
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      backupCodes: twoFactor.backupCodes,
    };
  }

  // Verify 2FA token
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.enabled) {
      return false;
    }

    // Try TOTP first
    const totpValid = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (totpValid) return true;

    // Try backup codes
    if (twoFactor.backupCodes.includes(token)) {
      // Remove used backup code
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: twoFactor.backupCodes.filter(code => code !== token),
        },
      });
      return true;
    }

    return false;
  }

  // Disable 2FA
  async disable(userId: string, token: string) {
    const verified = await this.verifyToken(userId, token);

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        enabled: false,
      },
    });

    return { success: true };
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string, token: string) {
    const verified = await this.verifyToken(userId, token);

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    const backupCodes = this.generateBackupCodes();

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        backupCodes,
      },
    });

    return { backupCodes };
  }

  // Generate backup codes
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
  }

  // Check if 2FA is enabled
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    return twoFactor?.enabled || false;
  }
}

export const twoFactorService = new TwoFactorService();
