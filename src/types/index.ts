// Типы данных для SSH Manager

// Статусы хоста
export type HostStatus = 'idle' | 'connecting' | 'connected' | 'executing' | 'success' | 'error' | 'retrying' | 'cancelled';

// Тип аутентификации
export type AuthType = 'password' | 'key';

// Формат ключа
export type KeyFormat = 'openssh' | 'putty';

// Один хост
export interface Host {
  id: string;
  ip: string;
  port: number;
  username: string;
  authType: AuthType;
  password?: string; // зашифрованный
  privateKey?: string; // зашифрованный
  keyFormat?: KeyFormat;
  passphrase?: string; // зашифрованный
  group?: string;
  name?: string;
  status: HostStatus;
  lastError?: string;
  retryCount: number;
  lastResult?: CommandResult;
}

// Результат выполнения команды
export interface CommandResult {
  hostId: string;
  hostIp: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number; // ms
  timestamp: Date;
  success: boolean;
}

// Настройки выполнения
export interface ExecutionSettings {
  connectionTimeout: number; // ms
  commandTimeout: number; // ms
  maxConcurrent: number;
  retryEnabled: boolean;
  retryAttempts: number;
  retryDelay: number; // ms
  retryInfinite: boolean;
}

// Настройки приложения
export interface AppSettings {
  saveHosts: boolean;
  encryptKeys: boolean;
  maxHistoryCommands: number;
  theme: 'light' | 'dark' | 'system';
  language: 'ru' | 'en';
}

// Пресет команды
export interface CommandPreset {
  id: string;
  name: string;
  command: string;
  description?: string;
  createdAt: Date;
}

// Группа хостов
export interface HostGroup {
  id: string;
  name: string;
  color: string;
  hostIds: string[];
}

// Состояние выполнения
export interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  totalHosts: number;
  completedHosts: number;
  successCount: number;
  errorCount: number;
  cancelled: boolean;
  startedAt?: Date;
  finishedAt?: Date;
}

// Событие WebSocket
export interface WSMessage {
  type: 'status' | 'result' | 'progress' | 'error' | 'complete';
  payload: unknown;
}

// Событие обновления статуса
export interface StatusUpdate {
  hostId: string;
  status: HostStatus;
  message?: string;
  retryCount?: number;
}

// Событие прогресса
export interface ProgressUpdate {
  total: number;
  completed: number;
  success: number;
  error: number;
  current?: string;
}

// Параметры выполнения команды
export interface ExecutionRequest {
  hosts: Host[];
  command: string;
  settings: ExecutionSettings;
}

// Результат парсинга файла
export interface ParseResult {
  hosts: Omit<Host, 'id' | 'status' | 'retryCount'>[];
  errors: string[];
  totalFound: number;
  validCount: number;
}

// Формат экспорта
export type ExportFormat = 'csv' | 'json' | 'txt' | 'xlsx';

// Данные для экспорта
export interface ExportData {
  results: CommandResult[];
  format: ExportFormat;
  includeTimestamp: boolean;
  includeErrors: boolean;
}

// История команд
export interface CommandHistory {
  id: string;
  command: string;
  executedAt: Date;
  hostCount: number;
  successCount: number;
  errorCount: number;
}

// Конфигурация SSH подключения
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  readyTimeout: number;
}

// Ответ API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
