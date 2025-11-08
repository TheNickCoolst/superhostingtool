import AgentService from './agent.service';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class FileManagerService {
  /**
   * Validates and sanitizes file paths to prevent path traversal attacks
   * @param filePath - The file path to validate
   * @returns Sanitized path
   * @throws AppError if path is dangerous
   */
  private validatePath(filePath: string): string {
    // Normalize the path to prevent traversal
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Dangerous patterns that should be blocked
    const dangerousPatterns = [
      /\.\./,                    // Parent directory references
      /^\/etc\//,                // System config directory
      /^\/root\//,               // Root home directory
      /^\/bin\//,                // System binaries
      /^\/sbin\//,               // System binaries
      /^\/usr\/bin\//,           // User binaries
      /^\/usr\/sbin\//,          // User system binaries
      /^\/proc\//,               // Process information
      /^\/sys\//,                // System information
      /^\/dev\//,                // Devices
      /^\/var\/run\//,           // Runtime data
      /^\/var\/lock\//,          // Lock files
      /^~\//,                    // Home directory shorthand
    ];

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedPath)) {
        throw new AppError('Access to this path is not allowed', 403);
      }
    }

    // Additional check: path must not contain null bytes
    if (normalizedPath.includes('\0')) {
      throw new AppError('Invalid path: null byte detected', 400);
    }

    // Ensure path stays within allowed boundaries
    // Path should either be relative or start with /minecraft or /server
    const allowedPrefixes = ['/minecraft', '/server', '/data'];
    const isRelative = !normalizedPath.startsWith('/');
    const hasAllowedPrefix = allowedPrefixes.some(prefix => normalizedPath.startsWith(prefix));

    if (!isRelative && !hasAllowedPrefix) {
      // Allow root path for listing
      if (normalizedPath !== '/' && normalizedPath !== '') {
        throw new AppError('Access restricted to server directories only', 403);
      }
    }

    return normalizedPath;
  }
  // List files in a directory
  async listFiles(serverId: string, filePath: string = '/') {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.listFiles(server.hostId, server.containerName, validatedPath);
  }

  // Read file content
  async readFile(serverId: string, filePath: string) {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.readFile(server.hostId, server.containerName, validatedPath);
  }

  // Write file content
  async writeFile(serverId: string, filePath: string, content: string) {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.writeFile(server.hostId, server.containerName, validatedPath, content);
  }

  // Delete file
  async deleteFile(serverId: string, filePath: string) {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    // Prevent deletion of critical files
    const protectedFiles = [
      'server.jar',
      'eula.txt',
      'server.properties'
    ];

    const fileName = validatedPath.split('/').pop();
    if (fileName && protectedFiles.includes(fileName)) {
      throw new AppError('Cannot delete protected file', 403);
    }

    return AgentService.deleteFile(server.hostId, server.containerName, validatedPath);
  }

  // Create directory
  async createDirectory(serverId: string, dirPath: string) {
    const validatedPath = this.validatePath(dirPath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.createDirectory(server.hostId, server.containerName, validatedPath);
  }

  // Upload file
  async uploadFile(serverId: string, filePath: string, fileBuffer: Buffer) {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.uploadFile(server.hostId, server.containerName, validatedPath, fileBuffer);
  }

  // Download file
  async downloadFile(serverId: string, filePath: string) {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.downloadFile(server.hostId, server.containerName, validatedPath);
  }

  // Get file info (size, modified date, etc.)
  async getFileInfo(serverId: string, filePath: string) {
    const validatedPath = this.validatePath(filePath);

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    return AgentService.getFileInfo(server.hostId, server.containerName, validatedPath);
  }
}

export default new FileManagerService();
