import prisma from '../lib/prisma';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import type { AuditLog, AuditAction, TwoFactorAuth, SecurityScan, ScanType } from '@prisma/client';

/**
 * Advanced Security Service
 *
 * - Two-Factor Authentication (2FA)
 * - Audit logging
 * - Container security scanning
 * - Access control
 */
class SecurityService {

  /**
   * Initialize 2FA for user
   */
  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CraftHost Pro (${userId})`,
      length: 32
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Store in database
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      update: {
        secret: secret.base32,
        backupCodes: hashedBackupCodes,
        enabled: false // Not enabled until verified
      },
      create: {
        userId,
        secret: secret.base32,
        backupCodes: hashedBackupCodes,
        enabled: false
      }
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    });

    if (!twoFactor || !twoFactor.enabled) {
      return false;
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps in either direction
    });

    return verified;
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(userId: string, token: string): Promise<boolean> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    });

    if (!twoFactor) {
      throw new Error('2FA not set up');
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return false;
    }

    // Enable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true }
    });

    return true;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string): Promise<void> {
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: false }
    });
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    });

    if (!twoFactor) return false;

    // Check each backup code
    for (const hashedCode of twoFactor.backupCodes) {
      const match = await bcrypt.compare(code, hashedCode);
      if (match) {
        // Remove used backup code
        const updatedCodes = twoFactor.backupCodes.filter(c => c !== hashedCode);
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { backupCodes: updatedCodes }
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Log audit event
   */
  async logAudit(
    userId: string,
    userName: string,
    action: AuditAction,
    resource: string,
    resourceId: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AuditLog> {
    return await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success,
        errorMessage
      }
    });
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters: {
    userId?: string;
    resource?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100
    });
  }

  /**
   * Scan container for vulnerabilities
   */
  async scanContainer(serverId: string, scanType: ScanType = 'CONTAINER'): Promise<SecurityScan> {
    const scan = await prisma.securityScan.create({
      data: {
        serverId,
        scanType,
        status: 'PENDING'
      }
    });

    // Execute scan asynchronously
    this.executeScan(scan.id).catch(error => {
      console.error(`Security scan failed: ${scan.id}`, error);
    });

    return scan;
  }

  /**
   * Execute security scan
   */
  private async executeScan(scanId: string): Promise<void> {
    try {
      await prisma.securityScan.update({
        where: { id: scanId },
        data: { status: 'SCANNING' }
      });

      // TODO: Integrate with Trivy or Snyk
      // Simulate scan
      await new Promise(resolve => setTimeout(resolve, 5000));

      const mockVulnerabilities = [
        {
          id: 'CVE-2023-1234',
          severity: 'HIGH',
          package: 'log4j',
          version: '2.14.1',
          fixedVersion: '2.17.1',
          description: 'Remote code execution vulnerability'
        }
      ];

      await prisma.securityScan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          vulnerabilities: mockVulnerabilities,
          severity: 'HIGH',
          completedAt: new Date()
        }
      });

    } catch (error: any) {
      await prisma.securityScan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * Get security scan results
   */
  async getScanResults(serverId: string): Promise<SecurityScan[]> {
    return await prisma.securityScan.findMany({
      where: { serverId },
      orderBy: { startedAt: 'desc' },
      take: 10
    });
  }

  /**
   * Get security dashboard
   */
  async getSecurityDashboard(): Promise<any> {
    const scans = await prisma.securityScan.findMany({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    const recentAudits = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const failedLogins = recentAudits.filter(
      a => a.action === 'LOGIN' && !a.success
    ).length;

    const criticalScans = scans.filter(
      s => s.severity === 'CRITICAL'
    ).length;

    const twoFactorEnabled = await prisma.twoFactorAuth.count({
      where: { enabled: true }
    });

    return {
      totalScans: scans.length,
      criticalVulnerabilities: criticalScans,
      failedLogins,
      twoFactorEnabled,
      recentActivity: recentAudits.slice(0, 10)
    };
  }
}

export default new SecurityService();
