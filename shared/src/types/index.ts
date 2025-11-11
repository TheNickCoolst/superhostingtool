// ==================== User Types ====================
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  maxServers: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR'
}

// ==================== Server Types ====================
export interface MinecraftServer {
  id: string;
  name: string;
  userId: string;
  hostId: string;
  status: ServerStatus;
  version: string;
  minecraftVersion: MinecraftVersionType;
  port: number;
  allocatedRam: number; // in MB
  allocatedCpu: number; // in cores (can be fractional, e.g., 0.5)
  maxPlayers: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  enableWhitelist: boolean;
  containerName: string;
  createdAt: Date;
  updatedAt: Date;
  lastStarted?: Date;
  mods?: ServerMod[];
  backups?: Backup[];
  stats?: ServerStats;
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
  PEACEFUL = 'peaceful',
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard'
}

export enum GameMode {
  SURVIVAL = 'survival',
  CREATIVE = 'creative',
  ADVENTURE = 'adventure',
  SPECTATOR = 'spectator'
}

// ==================== Host Types ====================
export interface Host {
  id: string;
  name: string;
  ipAddress: string;
  apiKey: string;
  status: HostStatus;
  totalRam: number; // in MB
  totalCpu: number; // number of cores
  usedRam: number;
  usedCpu: number;
  maxServers: number;
  activeServers: number;
  region: string;
  createdAt: Date;
  updatedAt: Date;
  lastHeartbeat?: Date;
}

export enum HostStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  OVERLOADED = 'OVERLOADED'
}

// ==================== Mod Types ====================
export interface Mod {
  id: string;
  name: string;
  description: string;
  version: string;
  minecraftVersion: string;
  modLoader: ModLoader;
  fileUrl?: string;
  fileName: string;
  fileSize: number;
  author: string;
  dependencies?: string[];
  createdAt: Date;
}

export enum ModLoader {
  FORGE = 'FORGE',
  FABRIC = 'FABRIC',
  QUILT = 'QUILT'
}

export interface ServerMod {
  modId: string;
  serverId: string;
  enabled: boolean;
  installedAt: Date;
}

// ==================== Backup Types ====================
export interface Backup {
  id: string;
  serverId: string;
  name: string;
  size: number; // in bytes
  type: BackupType;
  status: BackupStatus;
  filePath: string;
  createdAt: Date;
  restoredAt?: Date;
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

// ==================== Stats Types ====================
export interface ServerStats {
  serverId: string;
  onlinePlayers: number;
  maxPlayers: number;
  tps: number; // ticks per second
  ramUsage: number; // current RAM usage in MB
  cpuUsage: number; // current CPU usage percentage
  uptime: number; // in seconds
  lastUpdated: Date;
}

// ==================== Version Types ====================
export interface MinecraftVersion {
  id: string;
  version: string;
  type: MinecraftVersionType;
  releaseDate: Date;
  downloadUrl?: string;
  isStable: boolean;
}

// ==================== WebSocket Events ====================
export enum WebSocketEvent {
  SERVER_CREATED = 'server:created',
  SERVER_STATUS_CHANGED = 'server:status:changed',
  SERVER_STATS_UPDATE = 'server:stats:update',
  SERVER_LOG = 'server:log',
  SERVER_PLAYER_JOIN = 'server:player:join',
  SERVER_PLAYER_LEAVE = 'server:player:leave',
  HOST_STATUS_CHANGED = 'host:status:changed',
  BACKUP_PROGRESS = 'backup:progress',
  MOD_INSTALL_PROGRESS = 'mod:install:progress'
}

export interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  timestamp: Date;
}

// ==================== API Request/Response Types ====================
export interface CreateServerRequest {
  name: string;
  minecraftVersion: string;
  versionType: MinecraftVersionType;
  allocatedRam: number;
  allocatedCpu: number;
  maxPlayers: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  mods?: string[]; // mod IDs
}

export interface UpdateServerResourcesRequest {
  allocatedRam?: number;
  allocatedCpu?: number;
}

export interface ServerCommandRequest {
  command: string;
}

export interface UploadModRequest {
  name: string;
  description: string;
  version: string;
  minecraftVersion: string;
  modLoader: ModLoader;
  author: string;
}

// ==================== Agent Communication ====================
export interface AgentCommand {
  type: AgentCommandType;
  payload: any;
}

export enum AgentCommandType {
  CREATE_SERVER = 'CREATE_SERVER',
  START_SERVER = 'START_SERVER',
  STOP_SERVER = 'STOP_SERVER',
  RESTART_SERVER = 'RESTART_SERVER',
  DELETE_SERVER = 'DELETE_SERVER',
  UPDATE_RESOURCES = 'UPDATE_RESOURCES',
  EXECUTE_COMMAND = 'EXECUTE_COMMAND',
  CREATE_BACKUP = 'CREATE_BACKUP',
  RESTORE_BACKUP = 'RESTORE_BACKUP',
  INSTALL_MOD = 'INSTALL_MOD',
  REMOVE_MOD = 'REMOVE_MOD',
  UPDATE_SERVER = 'UPDATE_SERVER',
  GET_STATS = 'GET_STATS',
  LIST_FILES = 'LIST_FILES',
  READ_FILE = 'READ_FILE',
  WRITE_FILE = 'WRITE_FILE',
  DELETE_FILE = 'DELETE_FILE',
  CREATE_DIRECTORY = 'CREATE_DIRECTORY',
  UPLOAD_FILE = 'UPLOAD_FILE',
  DOWNLOAD_FILE = 'DOWNLOAD_FILE',
  GET_FILE_INFO = 'GET_FILE_INFO'
}

export interface AgentResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ==================== API Response Types ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  statusCode?: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== AI & Automation Types (NEW!) ====================
export interface AIRecommendation {
  id: string;
  serverId: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  potentialImpact?: string;
  suggestedAction: string;
  confidence: number;
  isApplied: boolean;
  appliedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
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

export interface AnomalyDetection {
  id: string;
  serverId: string;
  metricType: string;
  detectedValue: number;
  expectedValue: number;
  deviation: number;
  severity: AlertSeverity;
  isResolved: boolean;
  resolvedAt?: Date;
  detectedAt: Date;
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface AutoScalingPolicy {
  id: string;
  serverId: string;
  enabled: boolean;
  minRam: number;
  maxRam: number;
  minCpu: number;
  maxCpu: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  lastScalingAction?: Date;
}

// ==================== Achievement Types (NEW!) ====================
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: AchievementCategory;
  points: number;
  rarity: AchievementRarity;
  requirement: any;
  isHidden: boolean;
  createdAt: Date;
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

export interface PlayerAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  unlockedAt: Date;
}

// ==================== Social Types (NEW!) ====================
export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  requestedAt: Date;
  acceptedAt?: Date;
}

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED'
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  ownerId: string;
  level: number;
  experience: number;
  maxMembers: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuildMember {
  id: string;
  guildId: string;
  userId: string;
  role: GuildRole;
  joinedAt: Date;
  contribution: number;
}

export enum GuildRole {
  OWNER = 'OWNER',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
  RECRUIT = 'RECRUIT'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  guildId?: string;
  content: string;
  isRead: boolean;
  sentAt: Date;
}

// ==================== Marketplace Types (NEW!) ====================
export interface MarketplaceListing {
  id: string;
  sellerId: string;
  listingType: MarketplaceType;
  itemId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  downloads: number;
  rating?: number;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
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

export interface MarketplaceReview {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplacePurchase {
  id: string;
  listingId: string;
  buyerId: string;
  price: number;
  currency: string;
  transactionId: string;
  status: PurchaseStatus;
  purchasedAt: Date;
}

export enum PurchaseStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export interface UserCredits {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt: Date;
}

// ==================== Advanced Monitoring Types (NEW!) ====================
export interface HealthCheck {
  id: string;
  serverId: string;
  checkType: HealthCheckType;
  status: HealthStatus;
  responseTime?: number;
  message?: string;
  checkedAt: Date;
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

export interface AlertRule {
  id: string;
  serverId?: string;
  name: string;
  description?: string;
  metric: string;
  operator: ComparisonOperator;
  threshold: number;
  duration?: number;
  severity: AlertSeverity;
  isEnabled: boolean;
  notifyMethods: string[];
  cooldownPeriod: number;
  lastTriggered?: Date;
}

export enum ComparisonOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL'
}

export interface Incident {
  id: string;
  serverId: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolution?: string;
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}
