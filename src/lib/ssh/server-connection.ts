// SSH Connection Manager - ТОЛЬКО для серверной части

import type { Client, ConnectConfig } from 'ssh2';
import type { Host, CommandResult, HostStatus } from '@/types';
import crypto from 'crypto';

// Динамический импорт ssh2 только на сервере
async function getSSH2() {
  if (typeof window !== 'undefined') {
    throw new Error('SSH2 can only be used on the server side');
  }
  return await import('ssh2');
}

// Шифрование для хранения чувствительных данных
// ВНИМАНИЕ: В продакшене обязательно установите уникальный ENCRYPTION_KEY в .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

// Генерация ключа из секретной фразы
function getEncryptionKey(): Buffer {
  const secret = ENCRYPTION_KEY || 'ssh-manager-dev-key-change-in-production';
  // Используем уникальный salt для каждого приложения
  const salt = crypto.createHash('sha256').update('ssh-manager-salt-' + secret).digest();
  return crypto.scryptSync(secret, salt.slice(0, 16), 32);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Добавляем префикс для идентификации формата
  return 'srv:' + iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  try {
    // Проверяем формат
    if (encryptedText.startsWith('enc:')) {
      // Клиентский формат - декодируем base64
      const encoded = encryptedText.slice(4);
      return Buffer.from(encoded, 'base64').toString('utf8');
    }
    
    if (encryptedText.startsWith('srv:')) {
      // Серверный формат
      const parts = encryptedText.slice(4).split(':');
      if (parts.length !== 2) {
        return encryptedText;
      }
      
      const key = getEncryptionKey();
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    // Старый формат iv:encrypted
    const parts = encryptedText.split(':');
    if (parts.length === 2 && parts[0].length === 32) {
      // Возможно старый формат - пробуем декодировать
      try {
        const key = getEncryptionKey();
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        return encryptedText;
      }
    }
    
    return encryptedText; // Не зашифровано
  } catch {
    return encryptedText; // Если ошибка, возвращаем как есть
  }
}

// Создание SSH конфигурации
export function createSSHConfig(host: Host, decryptedPassword?: string, decryptedKey?: string, decryptedPassphrase?: string): ConnectConfig {
  const config: ConnectConfig = {
    host: host.ip,
    port: host.port,
    username: host.username,
    readyTimeout: 30000,
    keepaliveInterval: 10000,
  };

  if (host.authType === 'password' && decryptedPassword) {
    config.password = decryptedPassword;
  } else if (host.authType === 'key' && decryptedKey) {
    config.privateKey = decryptedKey;
    if (decryptedPassphrase) {
      config.passphrase = decryptedPassphrase;
    }
  }

  return config;
}

// Типы для SSH2 stream
interface SSHStream extends NodeJS.ReadableStream {
  on(event: 'close', listener: (code: number, signal: string) => void): this;
  on(event: 'data', listener: (data: Buffer) => void): this;
  stderr: NodeJS.ReadableStream;
}

// Выполнение команды на одном хосте
export async function executeOnHost(
  host: Host,
  command: string,
  timeout: number,
  onStatusChange?: (status: HostStatus, message?: string) => void
): Promise<CommandResult> {
  const ssh2 = await getSSH2();
  const ClientClass = ssh2.default?.Client || ssh2.Client;
  
  return new Promise((resolve, reject) => {
    const client = new ClientClass();
    const startTime = Date.now();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          client.end();
          client.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    };

    // Таймаут на выполнение
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Таймаут выполнения команды (${timeout}мс)`));
    }, timeout);

    client.on('ready', () => {
      onStatusChange?.('connected', 'Подключено');
      onStatusChange?.('executing', 'Выполнение команды...');

      client.exec(command, (err: Error | undefined, stream: SSHStream) => {
        if (err) {
          clearTimeout(timeoutId);
          cleanup();
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';
        let exitCode: number | null = null;

        stream.on('close', (code: number) => {
          clearTimeout(timeoutId);
          cleanup();
          
          exitCode = code;
          const duration = Date.now() - startTime;
          
          resolve({
            hostId: host.id,
            hostIp: host.ip,
            command,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
            duration,
            timestamp: new Date(),
            success: exitCode === 0,
          });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });

    client.on('error', (err: Error) => {
      clearTimeout(timeoutId);
      cleanup();
      reject(err);
    });

    client.on('close', () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error('Соединение закрыто'));
      }
    });

    try {
      // Расшифровываем данные для подключения
      const password = host.password ? decrypt(host.password) : undefined;
      const privateKey = host.privateKey ? decrypt(host.privateKey) : undefined;
      const passphrase = host.passphrase ? decrypt(host.passphrase) : undefined;

      const config = createSSHConfig(host, password, privateKey, passphrase);
      client.connect(config);
      onStatusChange?.('connecting', 'Подключение...');
    } catch (err) {
      clearTimeout(timeoutId);
      cleanup();
      reject(err);
    }
  });
}

// Пул соединений
export class SSHConnectionPool {
  private connections: Map<string, Client> = new Map();
  private maxConnections: number;

  constructor(maxConnections = 50) {
    this.maxConnections = maxConnections;
  }

  async execute(
    host: Host,
    command: string,
    timeout: number,
    onStatusChange?: (status: HostStatus, message?: string) => void
  ): Promise<CommandResult> {
    if (this.connections.size >= this.maxConnections) {
      throw new Error('Достигнут лимит одновременных подключений');
    }

    return executeOnHost(host, command, timeout, onStatusChange);
  }

  closeAll(): void {
    for (const [_id, client] of this.connections) {
      try {
        client.end();
        client.destroy();
      } catch {
        // Ignore errors
      }
    }
    this.connections.clear();
  }

  get activeCount(): number {
    return this.connections.size;
  }
}
