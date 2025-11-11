import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export class PrometheusService {
  private registry: Registry;
  private metrics: Map<string, any>;

  constructor() {
    this.registry = new Registry();
    this.metrics = new Map();
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics() {
    // Server metrics
    this.metrics.set('servers_total', new Gauge({
      name: 'minecraft_servers_total',
      help: 'Total number of Minecraft servers',
      labelNames: ['status'],
      registers: [this.registry],
    }));

    this.metrics.set('servers_cpu_usage', new Gauge({
      name: 'minecraft_server_cpu_usage',
      help: 'CPU usage of Minecraft server',
      labelNames: ['server_id', 'server_name'],
      registers: [this.registry],
    }));

    this.metrics.set('servers_ram_usage', new Gauge({
      name: 'minecraft_server_ram_usage_mb',
      help: 'RAM usage of Minecraft server in MB',
      labelNames: ['server_id', 'server_name'],
      registers: [this.registry],
    }));

    this.metrics.set('servers_players', new Gauge({
      name: 'minecraft_server_players_online',
      help: 'Number of online players',
      labelNames: ['server_id', 'server_name'],
      registers: [this.registry],
    }));

    this.metrics.set('servers_tps', new Gauge({
      name: 'minecraft_server_tps',
      help: 'Server TPS (ticks per second)',
      labelNames: ['server_id', 'server_name'],
      registers: [this.registry],
    }));

    // API metrics
    this.metrics.set('api_requests_total', new Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    }));

    this.metrics.set('api_request_duration', new Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    }));

    // Backup metrics
    this.metrics.set('backups_total', new Counter({
      name: 'backups_total',
      help: 'Total number of backups',
      labelNames: ['status', 'type'],
      registers: [this.registry],
    }));

    this.metrics.set('backup_size_bytes', new Gauge({
      name: 'backup_size_bytes',
      help: 'Size of backup in bytes',
      labelNames: ['server_id', 'backup_id'],
      registers: [this.registry],
    }));

    // Host metrics
    this.metrics.set('hosts_total', new Gauge({
      name: 'hosts_total',
      help: 'Total number of hosts',
      labelNames: ['status'],
      registers: [this.registry],
    }));

    this.metrics.set('host_ram_total_mb', new Gauge({
      name: 'host_ram_total_mb',
      help: 'Total RAM on host in MB',
      labelNames: ['host_id', 'host_name'],
      registers: [this.registry],
    }));

    this.metrics.set('host_ram_used_mb', new Gauge({
      name: 'host_ram_used_mb',
      help: 'Used RAM on host in MB',
      labelNames: ['host_id', 'host_name'],
      registers: [this.registry],
    }));

    // User metrics
    this.metrics.set('users_total', new Gauge({
      name: 'users_total',
      help: 'Total number of users',
      labelNames: ['role'],
      registers: [this.registry],
    }));
  }

  // Update server metrics
  updateServerMetrics(serverId: string, serverName: string, stats: any) {
    this.metrics.get('servers_cpu_usage').set(
      { server_id: serverId, server_name: serverName },
      stats.cpuUsage
    );

    this.metrics.get('servers_ram_usage').set(
      { server_id: serverId, server_name: serverName },
      stats.ramUsage
    );

    this.metrics.get('servers_players').set(
      { server_id: serverId, server_name: serverName },
      stats.onlinePlayers
    );

    this.metrics.get('servers_tps').set(
      { server_id: serverId, server_name: serverName },
      stats.tps
    );
  }

  // Increment API request counter
  incrementApiRequest(method: string, path: string, status: number) {
    this.metrics.get('api_requests_total').inc({
      method,
      path,
      status: Math.floor(status / 100) + 'xx',
    });
  }

  // Record API request duration
  recordApiRequestDuration(method: string, path: string, duration: number) {
    this.metrics.get('api_request_duration').observe(
      { method, path },
      duration
    );
  }

  // Increment backup counter
  incrementBackup(status: string, type: string) {
    this.metrics.get('backups_total').inc({ status, type });
  }

  // Get metrics as text
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get metrics as JSON
  async getMetricsJSON(): Promise<any> {
    return this.registry.getMetricsAsJSON();
  }

  // Reset all metrics
  reset() {
    this.registry.resetMetrics();
  }
}

export const prometheusService = new PrometheusService();
