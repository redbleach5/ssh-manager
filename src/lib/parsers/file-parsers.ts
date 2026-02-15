// Парсеры файлов для импорта хостов

import * as xlsx from 'xlsx';
import { ParseResult, Host, AuthType, KeyFormat } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Валидация IP адреса
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(':')[0].split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  return ipv6Regex.test(ip);
}

// Извлечение IP из строки
function extractIPsFromString(str: string): string[] {
  const ips: string[] = [];
  
  // Паттерны для поиска IP с возможным портом
  const patterns = [
    /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?/g, // IPv4 с портом
    /([0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4})/g // IPv6
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(str)) !== null) {
      if (match[2]) {
        ips.push(`${match[1]}:${match[2]}`);
      } else {
        ips.push(match[1]);
      }
    }
  }

  return ips;
}

// Парсинг IP с портом
function parseIPWithPort(ipStr: string): { ip: string; port: number } {
  const parts = ipStr.split(':');
  if (parts.length === 2 && !ipStr.includes('::')) {
    return { ip: parts[0], port: parseInt(parts[1], 10) || 22 };
  }
  return { ip: ipStr, port: 22 };
}

// Парсинг TXT файла
export function parseTxtFile(content: string, defaultUsername = 'root'): ParseResult {
  const hosts: ParseResult['hosts'] = [];
  const errors: string[] = [];
  const lines = content.split(/[\r\n]+/);
  let totalFound = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // Извлекаем IP адреса из строки
    const extractedIPs = extractIPsFromString(line);
    
    for (const ipStr of extractedIPs) {
      totalFound++;
      const { ip, port } = parseIPWithPort(ipStr);

      if (isValidIP(ip)) {
        // Проверяем, есть ли дополнительные данные в строке
        const parts = line.split(/[\s,;]+/).filter(p => p && !extractIPsFromString(p).length);
        
        let username = defaultUsername;
        let password: string | undefined;
        let name: string | undefined;

        // Форматы: IP user pass, IP,user,pass, IP;name;user;pass
        if (parts.length >= 1) {
          // Первый не-IP элемент может быть именем или username
          const firstPart = parts[0];
          if (parts.length >= 2) {
            name = firstPart;
            username = parts[1] || defaultUsername;
            if (parts.length >= 3) {
              password = parts[2];
            }
          } else {
            username = firstPart;
          }
        }

        hosts.push({
          ip,
          port,
          username,
          password,
          authType: password ? 'password' : 'key',
          name,
        });
      } else {
        errors.push(`Строка ${i + 1}: Неверный IP адрес "${ipStr}"`);
      }
    }
  }

  return {
    hosts,
    errors,
    totalFound,
    validCount: hosts.length,
  };
}

// Парсинг CSV файла
export function parseCsvFile(content: string, defaultUsername = 'root'): ParseResult {
  const hosts: ParseResult['hosts'] = [];
  const errors: string[] = [];
  let totalFound = 0;

  const lines = content.split(/[\r\n]+/).filter(l => l.trim());
  if (lines.length === 0) {
    return { hosts, errors, totalFound: 0, validCount: 0 };
  }

  // Определяем заголовки
  const headerLine = lines[0].toLowerCase();
  const hasHeader = headerLine.includes('ip') || headerLine.includes('host') || headerLine.includes('адрес');
  
  let headers: string[] = [];
  let dataStartLine = 0;

  if (hasHeader) {
    headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
    dataStartLine = 1;
  } else {
    // Стандартные заголовки
    headers = ['ip', 'port', 'username', 'password', 'name'];
  }

  for (let i = dataStartLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const values = line.split(/[;,]/).map(v => v.trim());
    totalFound++;

    const ipIndex = headers.findIndex(h => h === 'ip' || h === 'host' || h === 'адрес');
    const portIndex = headers.findIndex(h => h === 'port' || h === 'порт');
    const userIndex = headers.findIndex(h => h === 'user' || h === 'username' || h === 'login' || h === 'пользователь');
    const passIndex = headers.findIndex(h => h === 'pass' || h === 'password' || h === 'пароль');
    const nameIndex = headers.findIndex(h => h === 'name' || h === 'hostname' || h === 'имя');

    const ipValue = ipIndex >= 0 ? values[ipIndex] : values[0];
    const { ip, port } = parseIPWithPort(ipValue);

    if (isValidIP(ip)) {
      hosts.push({
        ip,
        port: portIndex >= 0 ? parseInt(values[portIndex], 10) || port : port,
        username: userIndex >= 0 ? values[userIndex] || defaultUsername : defaultUsername,
        password: passIndex >= 0 ? values[passIndex] : undefined,
        authType: passIndex >= 0 && values[passIndex] ? 'password' : 'key',
        name: nameIndex >= 0 ? values[nameIndex] : undefined,
      });
    } else {
      errors.push(`Строка ${i + 1}: Неверный IP адрес "${ipValue}"`);
    }
  }

  return {
    hosts,
    errors,
    totalFound,
    validCount: hosts.length,
  };
}

// Парсинг XLSX/XLS файла
export function parseExcelFile(buffer: Buffer, defaultUsername = 'root'): ParseResult {
  const hosts: ParseResult['hosts'] = [];
  const errors: string[] = [];
  let totalFound = 0;

  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (jsonData.length === 0) {
      return { hosts, errors, totalFound: 0, validCount: 0 };
    }

    // Определяем заголовки
    const firstRow = (jsonData[0] as string[]).map(h => (h || '').toString().toLowerCase());
    const hasHeader = firstRow.some(h => 
      h.includes('ip') || h.includes('host') || h.includes('адрес')
    );

    let headers: string[] = [];
    let dataStartRow = 0;

    if (hasHeader) {
      headers = firstRow;
      dataStartRow = 1;
    } else {
      headers = ['ip', 'port', 'username', 'password', 'name'];
    }

    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i] as string[];
      if (!row || row.length === 0) continue;

      totalFound++;

      const ipIndex = headers.findIndex(h => h === 'ip' || h === 'host' || h.includes('адрес'));
      const portIndex = headers.findIndex(h => h === 'port' || h.includes('порт'));
      const userIndex = headers.findIndex(h => h === 'user' || h === 'username' || h === 'login' || h.includes('пользователь'));
      const passIndex = headers.findIndex(h => h === 'pass' || h === 'password' || h.includes('пароль'));
      const nameIndex = headers.findIndex(h => h === 'name' || h === 'hostname' || h.includes('имя'));

      const ipValue = ipIndex >= 0 ? (row[ipIndex] || '').toString() : (row[0] || '').toString();
      const { ip, port } = parseIPWithPort(ipValue);

      if (isValidIP(ip)) {
        hosts.push({
          ip,
          port: portIndex >= 0 ? parseInt((row[portIndex] || '').toString(), 10) || port : port,
          username: userIndex >= 0 ? (row[userIndex] || defaultUsername).toString() : defaultUsername,
          password: passIndex >= 0 ? (row[passIndex] || '').toString() || undefined : undefined,
          authType: passIndex >= 0 && row[passIndex] ? 'password' : 'key',
          name: nameIndex >= 0 ? (row[nameIndex] || '').toString() || undefined : undefined,
        });
      } else {
        errors.push(`Строка ${i + 1}: Неверный IP адрес "${ipValue}"`);
      }
    }
  } catch (error) {
    errors.push(`Ошибка чтения Excel файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }

  return {
    hosts,
    errors,
    totalFound,
    validCount: hosts.length,
  };
}

// Универсальный парсер файла
export function parseFile(
  file: File,
  content: string | Buffer,
  defaultUsername = 'root'
): Promise<ParseResult> {
  return new Promise((resolve) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'txt':
        resolve(parseTxtFile(content as string, defaultUsername));
        break;
      case 'csv':
        resolve(parseCsvFile(content as string, defaultUsername));
        break;
      case 'xlsx':
      case 'xls':
        resolve(parseExcelFile(content as Buffer, defaultUsername));
        break;
      default:
        resolve({
          hosts: [],
          errors: [`Неподдерживаемый формат файла: ${extension}`],
          totalFound: 0,
          validCount: 0,
        });
    }
  });
}

// Преобразование в Host объекты с ID
export function createHostsFromParseResult(
  parseResult: ParseResult,
  existingHosts: Host[] = []
): Host[] {
  const hosts: Host[] = [...existingHosts];
  
  for (const parsedHost of parseResult.hosts) {
    // Проверяем на дубликаты
    const existing = hosts.find(h => h.ip === parsedHost.ip && h.port === parsedHost.port);
    if (!existing) {
      hosts.push({
        id: uuidv4(),
        ...parsedHost,
        status: 'idle',
        retryCount: 0,
      });
    }
  }

  return hosts;
}
