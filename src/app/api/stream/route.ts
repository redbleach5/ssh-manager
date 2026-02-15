// API Route для streaming выполнения команд (Server-Sent Events)

import { NextRequest } from 'next/server';
import { executeOnHost } from '@/lib/ssh/server-connection';
import { Host, ExecutionSettings } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Глобальное хранилище для отмены
const abortControllers = new Map<string, AbortController>();

// Лимиты безопасности
const MAX_HOSTS = 1000;
const MAX_COMMAND_LENGTH = 10000;
const MAX_CONCURRENT_DEFAULT = 30;

// Валидация IP адреса
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// Валидация хоста
function validateHost(host: Host): { valid: boolean; error?: string } {
  if (!host.ip || !isValidIP(host.ip)) {
    return { valid: false, error: `Неверный IP адрес: ${host.ip}` };
  }
  if (!host.username || host.username.length > 64) {
    return { valid: false, error: `Неверное имя пользователя` };
  }
  if (host.port < 1 || host.port > 65535) {
    return { valid: false, error: `Неверный порт: ${host.port}` };
  }
  return { valid: true };
}

// Санитизация сообщения об ошибке (убираем чувствительные данные)
function sanitizeError(message: string): string {
  // Убираем возможные пароли из сообщений об ошибках
  return message
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/pass[=:]\s*\S+/gi, 'pass=***')
    .replace(/key[=:]\s*\S+/gi, 'key=***');
}

export const maxDuration = 300; // 5 минут максимум

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Неверный формат JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { hosts, command, settings } = body as {
    hosts: Host[];
    command: string;
    settings: ExecutionSettings;
  };

  // Валидация обязательных параметров
  if (!hosts || !Array.isArray(hosts) || hosts.length === 0) {
    return new Response(JSON.stringify({ error: 'Список хостов пуст или отсутствует' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!command || typeof command !== 'string') {
    return new Response(JSON.stringify({ error: 'Команда отсутствует или неверного формата' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Проверка лимитов
  if (hosts.length > MAX_HOSTS) {
    return new Response(JSON.stringify({ error: `Максимум ${MAX_HOSTS} хостов за один запрос` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (command.length > MAX_COMMAND_LENGTH) {
    return new Response(JSON.stringify({ error: `Максимальная длина команды: ${MAX_COMMAND_LENGTH} символов` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Валидация хостов
  const invalidHosts = hosts.filter(h => !validateHost(h).valid);
  if (invalidHosts.length > 0) {
    return new Response(JSON.stringify({ 
      error: `Невалидные хосты: ${invalidHosts.slice(0, 5).map(h => h.ip).join(', ')}${invalidHosts.length > 5 ? '...' : ''}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Безопасные настройки
  const safeSettings: ExecutionSettings = {
    connectionTimeout: Math.min(settings?.connectionTimeout || 30000, 120000),
    commandTimeout: Math.min(settings?.commandTimeout || 60000, 300000),
    maxConcurrent: Math.min(settings?.maxConcurrent || MAX_CONCURRENT_DEFAULT, 100),
    retryEnabled: settings?.retryEnabled ?? true,
    retryAttempts: Math.min(settings?.retryAttempts || 3, 100),
    retryDelay: Math.min(settings?.retryDelay || 5000, 60000),
    retryInfinite: settings?.retryInfinite ?? false,
  };

  const executionId = uuidv4();
  const abortController = new AbortController();
  abortControllers.set(executionId, abortController);

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (!cancelled) {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // Controller might be closed
          }
        }
      };

      // Отправляем начальное состояние
      sendEvent('start', {
        executionId,
        total: hosts.length,
        timestamp: new Date().toISOString(),
      });

      let completed = 0;
      let successCount = 0;
      let errorCount = 0;

      // Асинхронное выполнение с пулом
      const executing = new Set<Promise<void>>();

      const executeHost = async (host: Host, attempt = 1): Promise<void> => {
        if (cancelled || abortController.signal.aborted) return;

        // Отправляем статус подключения
        sendEvent('status', {
          hostId: host.id,
          ip: host.ip,
          status: 'connecting',
          attempt,
        });

        try {
          const result = await executeOnHost(
            host,
            command,
            safeSettings.commandTimeout,
            (status, message) => {
              sendEvent('status', {
                hostId: host.id,
                ip: host.ip,
                status,
                message,
                attempt,
              });
            }
          );

          completed++;
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }

          sendEvent('result', {
            hostId: host.id,
            result,
            progress: { completed, success: successCount, error: errorCount },
          });
        } catch (error) {
          const errorMessage = sanitizeError(
            error instanceof Error ? error.message : 'Неизвестная ошибка'
          );
          
          // Проверяем, нужно ли повторять
          const shouldRetry = safeSettings.retryEnabled && 
            (safeSettings.retryInfinite || attempt < safeSettings.retryAttempts);

          if (shouldRetry && !cancelled) {
            sendEvent('status', {
              hostId: host.id,
              ip: host.ip,
              status: 'retrying',
              attempt: attempt + 1,
              maxAttempts: safeSettings.retryInfinite ? '∞' : safeSettings.retryAttempts,
              error: errorMessage,
            });

            // Ждем перед повтором
            await new Promise(resolve => setTimeout(resolve, safeSettings.retryDelay));
            
            if (!cancelled && !abortController.signal.aborted) {
              return executeHost(host, attempt + 1);
            }
          }

          completed++;
          errorCount++;

          sendEvent('error', {
            hostId: host.id,
            ip: host.ip,
            error: errorMessage,
            attempt,
            progress: { completed, success: successCount, error: errorCount },
          });
        }
      };

      // Запускаем выполнение с ограничением параллелизма
      const queue = [...hosts];
      
      const processQueue = async () => {
        while (queue.length > 0 && !cancelled && !abortController.signal.aborted) {
          while (executing.size < safeSettings.maxConcurrent && queue.length > 0) {
            const host = queue.shift();
            if (host) {
              const promise = executeHost(host).finally(() => {
                executing.delete(promise);
              });
              executing.add(promise);
            }
          }
          
          if (executing.size >= safeSettings.maxConcurrent) {
            await Promise.race([...executing]);
          }
        }
        
        // Ждем завершения всех
        await Promise.all([...executing]);
      };

      // Обрабатываем отмену
      abortController.signal.addEventListener('abort', () => {
        cancelled = true;
        sendEvent('cancelled', { executionId });
      });

      await processQueue();

      // Отправляем финальное событие
      sendEvent('complete', {
        executionId,
        summary: {
          total: hosts.length,
          completed,
          success: successCount,
          error: errorCount,
          cancelled,
        },
        timestamp: new Date().toISOString(),
      });

      abortControllers.delete(executionId);
      try {
        controller.close();
      } catch {
        // Already closed
      }
    },
    cancel() {
      cancelled = true;
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Отмена выполнения
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  if (!executionId) {
    return new Response(JSON.stringify({ success: false, error: 'ID выполнения не указан' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (abortControllers.has(executionId)) {
    const controller = abortControllers.get(executionId);
    controller?.abort();
    abortControllers.delete(executionId);
    
    return new Response(JSON.stringify({ success: true, message: 'Выполнение отменено' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: false, error: 'Выполнение не найдено' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
