// Утилиты шифрования (работают и в браузере, и на сервере)
// Для клиентской части - простое кодирование base64
// Для серверной - полноценное AES шифрование

const isServer = typeof window === 'undefined';

// Простой ключ для клиентского кодирования (не для реальной безопасности)
const CLIENT_KEY = 'ssh-manager-client-key';

// Клиентское "шифрование" - base64 с обфускацией
function clientEncrypt(text: string): string {
  try {
    // Простое base64 кодирование с префиксом
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return `enc:${encoded}`;
  } catch {
    return text;
  }
}

function clientDecrypt(encryptedText: string): string {
  try {
    if (!encryptedText.startsWith('enc:')) {
      return encryptedText;
    }
    const encoded = encryptedText.slice(4);
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return encryptedText;
  }
}

// Серверное шифрование с crypto
let serverCrypto: typeof import('crypto') | null = null;

async function getServerCrypto() {
  if (!serverCrypto && isServer) {
    serverCrypto = await import('crypto');
  }
  return serverCrypto;
}

export async function encrypt(text: string): Promise<string> {
  if (isServer) {
    const crypto = await getServerCrypto();
    if (crypto) {
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'ssh-manager-key', 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `aes:${iv.toString('hex')}:${encrypted}`;
    }
  }
  return clientEncrypt(text);
}

export async function decrypt(encryptedText: string): Promise<string> {
  if (encryptedText.startsWith('aes:') && isServer) {
    const crypto = await getServerCrypto();
    if (crypto) {
      try {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'ssh-manager-key', 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        return encryptedText;
      }
    }
  }
  return clientDecrypt(encryptedText);
}

// Синхронные версии для совместимости
export function encryptSync(text: string): string {
  return clientEncrypt(text);
}

export function decryptSync(encryptedText: string): string {
  return clientDecrypt(encryptedText);
}
