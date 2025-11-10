import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CraftHost Pro API',
      version: '2.0.0',
      description: 'Professional Minecraft Server Hosting Platform API',
      contact: {
        name: 'API Support',
        email: 'support@crafthost.pro',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.crafthost.pro',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
          },
        },
        MinecraftServer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: {
              type: 'string',
              enum: ['CREATING', 'STOPPED', 'STARTING', 'RUNNING', 'STOPPING', 'RESTARTING', 'ERROR', 'UPDATING']
            },
            version: { type: 'string' },
            port: { type: 'integer' },
            allocatedRam: { type: 'integer', description: 'RAM in MB' },
            allocatedCpu: { type: 'number', description: 'CPU cores' },
            maxPlayers: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            plan: {
              type: 'string',
              enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']
            },
            maxServers: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Plugin: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            version: { type: 'string' },
            author: { type: 'string' },
            category: {
              type: 'string',
              enum: ['ADMINISTRATION', 'GAMEPLAY', 'MECHANICS', 'ECONOMY', 'CHAT', 'TELEPORTATION', 'WORLD_MANAGEMENT', 'PROTECTION', 'FUN', 'DEVELOPER_TOOLS', 'MISC']
            },
            downloads: { type: 'integer' },
            rating: { type: 'number' },
            price: { type: 'number' },
          },
        },
        ProxyServer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: ['BUNGEECORD', 'VELOCITY', 'WATERFALL']
            },
            port: { type: 'integer' },
            status: { type: 'string' },
            maxPlayers: { type: 'integer' },
          },
        },
        AIRecommendation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            serverId: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['RESOURCE_OPTIMIZATION', 'PERFORMANCE_TUNING', 'SECURITY_IMPROVEMENT', 'COST_REDUCTION', 'PLAYER_RETENTION', 'BACKUP_STRATEGY']
            },
            title: { type: 'string' },
            description: { type: 'string' },
            impact: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            applied: { type: 'boolean' },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        ApiKeyAuth: [],
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Servers', description: 'Minecraft server management' },
      { name: 'Organizations', description: 'Multi-tenancy and team management' },
      { name: 'Plugins', description: 'Plugin marketplace' },
      { name: 'Proxies', description: 'Proxy server management (BungeeCord, Velocity)' },
      { name: 'Backups', description: 'Backup management' },
      { name: 'Analytics', description: 'Server and player analytics' },
      { name: 'AI', description: 'AI-powered recommendations' },
      { name: 'Billing', description: 'Invoices and payments' },
      { name: 'Webhooks', description: 'Webhook management' },
      { name: 'Monitoring', description: 'Prometheus metrics and monitoring' },
      { name: 'Security', description: '2FA and security features' },
      { name: 'Worlds', description: 'World templates and management' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
