import AgentService from './agent.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FileManagerService {
  // List files in a directory
  async listFiles(serverId: string, path: string = '/') {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Validate path before listing
    this.validateFilePath(path);

    return AgentService.listFiles(server.hostId, server.containerName, path);
  }

  // Read file content
  async readFile(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Validate path before reading
    this.validateFilePath(filePath);

    return AgentService.readFile(server.hostId, server.containerName, filePath);
  }

  // Write file content
  async writeFile(serverId: string, filePath: string, content: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Enhanced security: Validate and sanitize file path
    this.validateFilePath(filePath);

    return AgentService.writeFile(server.hostId, server.containerName, filePath, content);
  }

  /**
   * Enhanced file path validation to prevent path traversal attacks
   * Uses path normalization and whitelist approach
   */
  private validateFilePath(filePath: string): void {
    const path = require('path');

    // Normalize path to prevent ../ and encoded attacks
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Check for null bytes (common in path traversal attacks)
    if (normalizedPath.includes('\0')) {
      throw new Error('Invalid file path: null bytes detected');
    }

    // Blacklist dangerous paths
    const dangerousPatterns = [
      /\.\./,  // parent directory
      /^\/etc\//,
      /^\/root\//,
      /^\/bin\//,
      /^\/sbin\//,
      /^\/usr\/bin\//,
      /^\/proc\//,
      /^\/sys\//,
      /^\/dev\//,
      /^\/var\/run\//,
      /^\/boot\//,
      /\0/,  // null byte
      /%2e%2e/i,  // encoded ../
      /%00/i,  // encoded null byte
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedPath) || pattern.test(filePath)) {
        throw new Error('Access to this path is not allowed');
      }
    }

    // Ensure path is relative and within allowed directories
    if (path.isAbsolute(normalizedPath) && !normalizedPath.startsWith('/minecraft/')) {
      throw new Error('Absolute paths outside /minecraft/ are not allowed');
    }
  }

  // Delete file
  async deleteFile(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Validate path before deletion
    this.validateFilePath(filePath);

    // Prevent deletion of critical files
    const protectedFiles = [
      'server.jar',
      'eula.txt',
      'server.properties'
    ];

    const fileName = filePath.split('/').pop();
    if (fileName && protectedFiles.includes(fileName)) {
      throw new Error('Cannot delete protected file');
    }

    return AgentService.deleteFile(server.hostId, server.containerName, filePath);
  }

  // Create directory
  async createDirectory(serverId: string, dirPath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    return AgentService.createDirectory(server.hostId, server.containerName, dirPath);
  }

  // Upload file
  async uploadFile(serverId: string, filePath: string, fileBuffer: Buffer) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Validate path and file before upload
    this.validateFilePath(filePath);
    this.validateFileUpload(filePath, fileBuffer);

    return AgentService.uploadFile(server.hostId, server.containerName, filePath, fileBuffer);
  }

  /**
   * Validates file uploads to prevent malicious files
   */
  private validateFileUpload(filePath: string, fileBuffer: Buffer): void {
    const path = require('path');
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();

    // Maximum file size: 100MB for worlds, 50MB for mods, 10MB for configs
    const maxSizes: { [key: string]: number } = {
      '.jar': 50 * 1024 * 1024,  // 50MB for mods/plugins
      '.zip': 100 * 1024 * 1024,  // 100MB for worlds
      '.json': 10 * 1024 * 1024,  // 10MB for configs
      '.yml': 10 * 1024 * 1024,
      '.yaml': 10 * 1024 * 1024,
      '.properties': 1 * 1024 * 1024,
      '.txt': 1 * 1024 * 1024,
    };

    const maxSize = maxSizes[fileExtension] || 10 * 1024 * 1024; // Default 10MB

    if (fileBuffer.length > maxSize) {
      throw new Error(`File too large. Maximum size for ${fileExtension} files is ${maxSize / 1024 / 1024}MB`);
    }

    // Allowed file extensions
    const allowedExtensions = [
      '.jar', '.zip', '.json', '.yml', '.yaml',
      '.properties', '.txt', '.png', '.jpg', '.jpeg',
      '.dat', '.mcmeta', '.nbt', '.mca', '.mcfunction',
      '.toml', '.conf', '.cfg'
    ];

    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(`File type ${fileExtension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Check for executable scripts in disguise
    const fileHeader = fileBuffer.slice(0, 100).toString('utf-8', 0, 100);
    const dangerousPatterns = [
      /^#!\/bin\/(ba)?sh/,  // Shell scripts
      /^#!\/usr\/bin\/env/,
      /<\?php/i,  // PHP scripts
      /<script/i,  // JavaScript in files
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fileHeader)) {
        throw new Error('Executable or script files are not allowed');
      }
    }
  }

  // Download file
  async downloadFile(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    return AgentService.downloadFile(server.hostId, server.containerName, filePath);
  }

  // Get file info (size, modified date, etc.)
  async getFileInfo(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    return AgentService.getFileInfo(server.hostId, server.containerName, filePath);
  }
}

export default new FileManagerService();
