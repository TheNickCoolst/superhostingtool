import { Server as WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '@minecraft-hosting/shared';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';

/**
 * WebSocket Service für Echtzeit-Updates
 * Singleton Pattern - nur eine Instanz für die gesamte Anwendung
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private clientUsers: Map<string, { id: string; email: string }> = new Map();

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
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // Authentifizierung: JWT Token aus Query-String extrahieren
      const token = this.extractToken(req);

      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Token verifizieren
      const user = this.verifyToken(token);
      if (!user) {
        console.log('WebSocket connection rejected: Invalid token');
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      this.clientUsers.set(clientId, user);

      console.log(`WebSocket client connected: ${clientId} (User: ${user.email})`);

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
        this.clientUsers.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
        this.clientUsers.delete(clientId);
      });

      // Sende Willkommensnachricht
      this.send(clientId, {
        event: 'connected' as any,
        data: { clientId, user: { id: user.id, email: user.email } },
        timestamp: new Date()
      });
    });
  }

  /**
   * Extrahiert JWT Token aus dem Request
   * Unterstützt: Query-Parameter (?token=...) und Authorization Header
   */
  private extractToken(req: IncomingMessage): string | null {
    // 1. Versuche Token aus Query-String zu holen
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // 2. Versuche Token aus Authorization Header zu holen
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Verifiziert JWT Token und gibt User-Daten zurück
   */
  private verifyToken(token: string): { id: string; email: string } | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, secret) as {
        id: string;
        email: string;
        role: string;
      };

      return {
        id: decoded.id,
        email: decoded.email
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
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
