// Temporary Prisma enum definitions until Prisma client can be properly generated
// These are extracted from prisma/schema.prisma

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR'
}

export enum HostStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  OVERLOADED = 'OVERLOADED'
}

export enum ServerStatus {
  CREATING = 'CREATING',
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  RESTARTING = 'RESTARTING',
  ERROR = 'ERROR',
  UPDATING = 'UPDATING'
}

export enum MinecraftVersionType {
  VANILLA = 'VANILLA',
  SNAPSHOT = 'SNAPSHOT',
  FORGE = 'FORGE',
  FABRIC = 'FABRIC',
  PAPER = 'PAPER',
  SPIGOT = 'SPIGOT',
  BUKKIT = 'BUKKIT'
}

export enum Difficulty {
  PEACEFUL = 'PEACEFUL',
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum GameMode {
  SURVIVAL = 'SURVIVAL',
  CREATIVE = 'CREATIVE',
  ADVENTURE = 'ADVENTURE',
  SPECTATOR = 'SPECTATOR'
}

export enum ModLoader {
  FORGE = 'FORGE',
  FABRIC = 'FABRIC',
  QUILT = 'QUILT'
}

export enum BackupType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  PRE_UPDATE = 'PRE_UPDATE'
}

export enum BackupStatus {
  CREATING = 'CREATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RESTORING = 'RESTORING'
}

export enum TaskType {
  BACKUP = 'BACKUP',
  RESTART = 'RESTART',
  COMMAND = 'COMMAND',
  ANNOUNCEMENT = 'ANNOUNCEMENT'
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  DISCORD = 'DISCORD'
}

export enum NotificationEvent {
  SERVER_STARTED = 'SERVER_STARTED',
  SERVER_STOPPED = 'SERVER_STOPPED',
  SERVER_CRASHED = 'SERVER_CRASHED',
  BACKUP_COMPLETED = 'BACKUP_COMPLETED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  HIGH_CPU_USAGE = 'HIGH_CPU_USAGE',
  HIGH_RAM_USAGE = 'HIGH_RAM_USAGE',
  LOW_TPS = 'LOW_TPS'
}

export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SEVERE = 'SEVERE',
  DEBUG = 'DEBUG'
}

export enum RecommendationType {
  PERFORMANCE_OPTIMIZATION = 'PERFORMANCE_OPTIMIZATION',
  RESOURCE_ADJUSTMENT = 'RESOURCE_ADJUSTMENT',
  COST_OPTIMIZATION = 'COST_OPTIMIZATION',
  SECURITY_IMPROVEMENT = 'SECURITY_IMPROVEMENT',
  BACKUP_STRATEGY = 'BACKUP_STRATEGY',
  PLUGIN_SUGGESTION = 'PLUGIN_SUGGESTION',
  VERSION_UPGRADE = 'VERSION_UPGRADE',
  MAINTENANCE_ALERT = 'MAINTENANCE_ALERT'
}

export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum AchievementCategory {
  SERVER_MANAGEMENT = 'SERVER_MANAGEMENT',
  PERFORMANCE = 'PERFORMANCE',
  COMMUNITY = 'COMMUNITY',
  CREATIVITY = 'CREATIVITY',
  LONGEVITY = 'LONGEVITY',
  SPECIAL = 'SPECIAL'
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export enum LeaderboardType {
  TOTAL_UPTIME = 'TOTAL_UPTIME',
  BEST_PERFORMANCE = 'BEST_PERFORMANCE',
  MOST_PLAYERS = 'MOST_PLAYERS',
  ACHIEVEMENT_POINTS = 'ACHIEVEMENT_POINTS',
  SERVER_COUNT = 'SERVER_COUNT',
  COMMUNITY_RATING = 'COMMUNITY_RATING'
}

export enum LeaderboardPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ALL_TIME = 'ALL_TIME'
}

export enum TournamentStatus {
  UPCOMING = 'UPCOMING',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  ELIMINATED = 'ELIMINATED',
  WINNER = 'WINNER',
  DISQUALIFIED = 'DISQUALIFIED'
}

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED'
}

export enum GuildRole {
  OWNER = 'OWNER',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
  RECRUIT = 'RECRUIT'
}

export enum ActivityType {
  SERVER_CREATED = 'SERVER_CREATED',
  SERVER_STARTED = 'SERVER_STARTED',
  SERVER_STOPPED = 'SERVER_STOPPED',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  FRIEND_ADDED = 'FRIEND_ADDED',
  GUILD_JOINED = 'GUILD_JOINED',
  TOURNAMENT_WON = 'TOURNAMENT_WON',
  MILESTONE_REACHED = 'MILESTONE_REACHED'
}

export enum MarketplaceType {
  MOD = 'MOD',
  PLUGIN = 'PLUGIN',
  TEMPLATE = 'TEMPLATE',
  SERVER = 'SERVER',
  WORLD = 'WORLD',
  ADDON = 'ADDON'
}

export enum ListingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export enum PurchaseStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
  REWARD = 'REWARD',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BONUS = 'BONUS'
}

export enum ProxyType {
  BUNGEECORD = 'BUNGEECORD',
  VELOCITY = 'VELOCITY',
  WATERFALL = 'WATERFALL'
}

export enum SnapshotType {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
  PRE_MIGRATION = 'PRE_MIGRATION',
  PRE_UPDATE = 'PRE_UPDATE'
}

export enum MigrationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum HealthCheckType {
  PING = 'PING',
  QUERY = 'QUERY',
  RCON = 'RCON',
  WEB = 'WEB',
  CUSTOM = 'CUSTOM'
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN'
}

export enum ReportPeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum ComparisonOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL'
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}

// Basic type interfaces for common Prisma types
export interface Host {
  id: string;
  name: string;
  ipAddress: string;
  apiKey: string;
  status: HostStatus;
  totalRam: number;
  totalCpu: number;
  usedRam: number;
  usedCpu: number;
  maxServers: number;
  activeServers: number;
  region: string;
  createdAt: Date;
  updatedAt: Date;
  lastHeartbeat: Date | null;
}

export interface MinecraftServer {
  id: string;
  name: string;
  userId: string;
  hostId: string;
  status: ServerStatus;
  version: string;
  minecraftVersion: MinecraftVersionType;
  port: number;
  allocatedRam: number;
  allocatedCpu: number;
  maxPlayers: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  enableWhitelist: boolean;
  containerName: string;
  createdAt: Date;
  updatedAt: Date;
  lastStarted: Date | null;
}
