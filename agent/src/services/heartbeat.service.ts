import axios from 'axios';

/**
 * Heartbeat Service
 * Sendet regelmäßige Heartbeats an das zentrale Backend
 * um zu signalisieren, dass der Host noch online ist
 */
export class HeartbeatService {
  private interval: NodeJS.Timeout | null = null;
  private backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  private hostId = process.env.HOST_ID;
  private apiKey = process.env.AGENT_API_KEY;

  start() {
    if (!this.hostId) {
      console.warn('HOST_ID not set, heartbeat service disabled');
      return;
    }

    // Sende alle 30 Sekunden einen Heartbeat
    this.interval = setInterval(async () => {
      await this.sendHeartbeat();
    }, 30000);

    // Sende sofort einen Heartbeat beim Start
    this.sendHeartbeat();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async sendHeartbeat() {
    try {
      await axios.post(
        `${this.backendUrl}/api/hosts/${this.hostId}/heartbeat`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      console.log('Heartbeat sent successfully');
    } catch (error: any) {
      console.error('Failed to send heartbeat:', error.message);
    }
  }
}
