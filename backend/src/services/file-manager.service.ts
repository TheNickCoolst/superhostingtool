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

    // Validate that we're not writing to dangerous files
    const dangerousPatterns = [
      '../',
      '/etc/',
      '/root/',
      '/bin/',
      '/sbin/',
      '/usr/bin/'
    ];

    for (const pattern of dangerousPatterns) {
      if (filePath.includes(pattern)) {
        throw new Error('Access to this path is not allowed');
      }
    }

    return AgentService.writeFile(server.hostId, server.containerName, filePath, content);
  }

  // Delete file
  async deleteFile(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

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

    return AgentService.uploadFile(server.hostId, server.containerName, filePath, fileBuffer);
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
