// Хук для выполнения SSH команд с SSE

import { useCallback, useRef, useState } from 'react';
import { Host, ExecutionSettings, CommandResult, HostStatus } from '@/types';
import { useSSHStore } from '@/store/ssh-store';

interface SSEEvent {
  type: 'start' | 'status' | 'result' | 'error' | 'complete' | 'cancelled';
  data: {
    executionId?: string;
    total?: number;
    timestamp?: string;
    hostId?: string;
    ip?: string;
    status?: HostStatus;
    message?: string;
    attempt?: number;
    maxAttempts?: number | string;
    error?: string;
    result?: CommandResult;
    progress?: {
      completed: number;
      success: number;
      error: number;
    };
    summary?: {
      total: number;
      completed: number;
      success: number;
      error: number;
      cancelled: boolean;
    };
  };
}

export function useSSHExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const {
    updateHostStatus,
    addResult,
    updateProgress,
    finishExecution,
    resetProgress,
    startExecution,
    cancelExecution,
    addHistory,
    executionSettings,
  } = useSSHStore();

  const executeCommand = useCallback(async (
    hosts: Host[],
    command: string,
    settings: ExecutionSettings
  ) => {
    if (isExecuting || hosts.length === 0) return;

    setIsExecuting(true);
    startExecution(command);

    // Сбрасываем статусы хостов
    hosts.forEach(host => {
      updateHostStatus(host.id, 'idle');
    });

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hosts, command, settings }),
      });

      if (!response.ok) {
        throw new Error('Ошибка запуска выполнения');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('Невозможно прочитать поток');
      }

      let successCount = 0;
      let errorCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            switch (eventType) {
              case 'start':
                setExecutionId(data.executionId);
                updateProgress({ total: data.total || hosts.length });
                break;

              case 'status':
                if (data.hostId && data.status) {
                  updateHostStatus(data.hostId, data.status, data.error);
                }
                break;

              case 'result':
                if (data.result) {
                  addResult(data.result);
                  if (data.progress) {
                    updateProgress(data.progress);
                    successCount = data.progress.success;
                    errorCount = data.progress.error;
                  }
                }
                break;

              case 'error':
                if (data.hostId) {
                  updateHostStatus(data.hostId, 'error', data.error);
                  if (data.progress) {
                    updateProgress(data.progress);
                    errorCount = data.progress.error;
                  }
                }
                break;

              case 'complete':
                addHistory(command, hosts.length, successCount, errorCount);
                finishExecution();
                break;

              case 'cancelled':
                cancelExecution();
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Execution error:', error);
      finishExecution();
    } finally {
      setIsExecuting(false);
      setExecutionId(null);
    }
  }, [isExecuting, startExecution, updateHostStatus, addResult, updateProgress, finishExecution, addHistory, cancelExecution]);

  const cancel = useCallback(async () => {
    if (executionId) {
      try {
        await fetch(`/api/stream?executionId=${executionId}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Cancel error:', error);
      }
    }
    cancelExecution();
    setIsExecuting(false);
    setExecutionId(null);
  }, [executionId, cancelExecution]);

  return {
    executeCommand,
    cancel,
    isExecuting,
    executionId,
  };
}
