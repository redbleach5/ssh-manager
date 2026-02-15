// API Route для streaming выполнения команд (Server-Sent Events)

import { NextRequest } from 'next/server';
import { executeOnHost } from '@/lib/ssh/server-connection';
import { Host, ExecutionSettings } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Глобальное хранилище для отмены
const abortControllers = new Map<string, AbortController>();

export const maxDuration = 300; // 5 минут максимум

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { hosts, command, settings } = body as {
    hosts: Host[];
    command: string;
    settings: ExecutionSettings;
  };

  if (!hosts || !command) {
    return new Response(JSON.stringify({ error: 'Отсутствуют параметры' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
            settings.commandTimeout,
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
          const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
          
          // Проверяем, нужно ли повторять
          const shouldRetry = settings.retryEnabled && 
            (settings.retryInfinite || attempt < settings.retryAttempts);

          if (shouldRetry && !cancelled) {
            sendEvent('status', {
              hostId: host.id,
              ip: host.ip,
              status: 'retrying',
              attempt: attempt + 1,
              maxAttempts: settings.retryInfinite ? '∞' : settings.retryAttempts,
              error: errorMessage,
            });

            // Ждем перед повтором
            await new Promise(resolve => setTimeout(resolve, settings.retryDelay));
            
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
          while (executing.size < settings.maxConcurrent && queue.length > 0) {
            const host = queue.shift();
            if (host) {
              const promise = executeHost(host).finally(() => {
                executing.delete(promise);
              });
              executing.add(promise);
            }
          }
          
          if (executing.size >= settings.maxConcurrent) {
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

  if (executionId && abortControllers.has(executionId)) {
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
