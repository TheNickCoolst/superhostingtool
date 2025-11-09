import prisma from '../lib/prisma.singleton';
import { AgentService } from './agent.service';
import { AgentCommandType } from '@minecraft-hosting/shared';

const agentService = new AgentService();

export class FileManagerService {
  /**
   * Lists files in a server directory
   */
  static async listFiles(serverId: string, path: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.LIST_FILES, {
      serverId,
      containerName: server.containerName,
      path
    });

    return response.data;
  }

  /**
   * Reads file content
   */
  static async readFile(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.READ_FILE, {
      serverId,
      containerName: server.containerName,
      filePath
    });

    return response.data;
  }

  /**
   * Writes content to a file
   */
  static async writeFile(serverId: string, filePath: string, content: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.WRITE_FILE, {
      serverId,
      containerName: server.containerName,
      filePath,
      content
    });

    return response;
  }

  /**
   * Deletes a file
   */
  static async deleteFile(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.DELETE_FILE, {
      serverId,
      containerName: server.containerName,
      filePath
    });

    return response;
  }

  /**
   * Creates a directory
   */
  static async createDirectory(serverId: string, dirPath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.CREATE_DIRECTORY, {
      serverId,
      containerName: server.containerName,
      dirPath
    });

    return response;
  }

  /**
   * Uploads a file
   */
  static async uploadFile(serverId: string, filePath: string, buffer: Buffer) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Convert buffer to base64 for transmission
    const content = buffer.toString('base64');

    const response = await agentService.sendCommand(server.host, AgentCommandType.UPLOAD_FILE, {
      serverId,
      containerName: server.containerName,
      filePath,
      content
    });

    return response;
  }

  /**
   * Downloads a file
   */
  static async downloadFile(serverId: string, filePath: string): Promise<Buffer> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.DOWNLOAD_FILE, {
      serverId,
      containerName: server.containerName,
      filePath
    });

    // Convert base64 back to buffer
    return Buffer.from(response.data.content, 'base64');
  }

  /**
   * Gets file information
   */
  static async getFileInfo(serverId: string, filePath: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const response = await agentService.sendCommand(server.host, AgentCommandType.GET_FILE_INFO, {
      serverId,
      containerName: server.containerName,
      filePath
    });

    return response.data;
  }
}

export default FileManagerService;
