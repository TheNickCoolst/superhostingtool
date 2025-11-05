import { Server as WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '@minecraft-hosting/shared';

/**
 * WebSocket Service für Echtzeit-Updates
 * Singleton Pattern - nur eine Instanz für die gesamte Anwendung
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  private constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocketServer();
  }

  static getInstance(wss?: WebSocketServer): WebSocketService {
    if (!WebSocketService.instance && wss) {
      WebSocketService.instance = new WebSocketService(wss);
    }
    return WebSocketService.instance;
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Sende Willkommensnachricht
      this.send(clientId, {
        event: 'connected' as any,
        data: { clientId },
        timestamp: new Date()
      });
    });
  }

  private handleMessage(clientId: string, data: any) {
    // Implementiere Subscription-Logik falls benötigt
    console.log(`Message from ${clientId}:`, data);
  }

  /**
   * Sendet eine Nachricht an einen spezifischen Client
   */
  send(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast: Sendet eine Nachricht an alle verbundenen Clients
   */
  broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Sendet eine Nachricht an alle Clients, die einen bestimmten Server abonniert haben
   */
  broadcastToServer(serverId: string, message: WebSocketMessage) {
    // In einer erweiterten Version könnte man hier Subscriptions verwalten
    // Für jetzt senden wir an alle Clients
    this.broadcast(message);
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
