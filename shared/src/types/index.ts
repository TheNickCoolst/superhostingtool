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
