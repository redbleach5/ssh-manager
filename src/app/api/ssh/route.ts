// API Route для выполнения SSH команд

import { NextRequest, NextResponse } from 'next/server';
import { executeOnHost, SSHConnectionPool } from '@/lib/ssh/connection';
import { Host, ExecutionSettings, CommandResult } from '@/types';

const connectionPool = new SSHConnectionPool(50);

// Хранилище активных выполнений для возможности отмены
const activeExecutions = new Map<string, boolean>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hosts, command, settings, executionId } = body as {
      hosts: Host[];
      command: string;
      settings: ExecutionSettings;
      executionId: string;
    };

    if (!hosts || !command || !settings) {
      return NextResponse.json(
        { success: false, error: 'Отсутствуют необходимые параметры' },
        { status: 400 }
      );
    }

    // Инициализируем выполнение
    activeExecutions.set(executionId, true);

    const results: CommandResult[] = [];
    const errors: { hostId: string; error: string }[] = [];
    
    // Асинхронное выполнение с ограничением параллелизма
    const executeWithConcurrency = async () => {
      const executing: Promise<void>[] = [];
      
      for (const host of hosts) {
        // Проверяем отмену
        if (!activeExecutions.get(executionId)) {
          break;
        }

        // Ждем, если достигнут лимит параллельных подключений
        while (executing.length >= settings.maxConcurrent) {
          await Promise.race(executing.map(p => p.catch(() => {})));
        }

        const task = executeOnHost(
          host,
          command,
          settings.commandTimeout,
          (status, message) => {
            // В реальном приложении здесь отправка WebSocket события
            console.log(`Host ${host.ip}: ${status} - ${message}`);
          }
        )
          .then((result) => {
            results.push(result);
          })
          .catch((error) => {
            errors.push({
              hostId: host.id,
              error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
          })
          .finally(() => {
            const index = executing.indexOf(task);
            if (index > -1) {
              executing.splice(index, 1);
            }
          });

        executing.push(task);
      }

      // Ждем завершения всех задач
      await Promise.all(executing);
    };

    await executeWithConcurrency();

    // Очищаем
    activeExecutions.delete(executionId);

    return NextResponse.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: hosts.length,
          success: results.filter(r => r.success).length,
          error: errors.length + results.filter(r => !r.success).length,
        },
      },
    });
  } catch (error) {
    console.error('SSH execution error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Отмена выполнения
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  if (executionId) {
    activeExecutions.set(executionId, false);
    connectionPool.closeAll();
    return NextResponse.json({ success: true, message: 'Выполнение отменено' });
  }

  return NextResponse.json(
    { success: false, error: 'ID выполнения не указан' },
    { status: 400 }
  );
}
