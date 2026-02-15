'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Square,
  Pause,
  Settings,
  History,
  Zap,
  Terminal,
  Clock,
  Loader2,
} from 'lucide-react';
import { useSSHStore, useSelectedHosts } from '@/store/ssh-store';
import { useSSHExecution } from '@/hooks/use-ssh-execution';

export function CommandExecutor() {
  const [command, setCommand] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    selectedHosts,
    executionSettings,
    updateExecutionSettings,
    presets,
    history,
    isExecuting,
    progress,
    cancel,
  } = useSSHStore();

  const selectedHostsData = useSelectedHosts();
  const { executeCommand, isExecuting: isRunning, cancel: cancelExecution } = useSSHExecution();

  const handleExecute = useCallback(() => {
    if (command.trim() && selectedHosts.length > 0) {
      executeCommand(selectedHostsData, command.trim(), executionSettings);
    }
  }, [command, selectedHosts, selectedHostsData, executionSettings, executeCommand]);

  const handleCancel = useCallback(() => {
    cancelExecution();
  }, [cancelExecution]);

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCommand(preset.command);
    }
  }, [presets]);

  const progressPercent = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Выполнение команд
            </CardTitle>
            <CardDescription>
              Выберите хосты и введите команду для выполнения
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="w-4 h-4 mr-2" />
                  История
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>История команд</DialogTitle>
                  <DialogDescription>Ранее выполненные команды</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[300px]">
                  {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      История пуста
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setCommand(item.command);
                            setShowHistory(false);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-sm font-mono">{item.command}</code>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.executedAt).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline">{item.hostCount} хостов</Badge>
                            <Badge variant="success">{item.successCount} успех</Badge>
                            {item.errorCount > 0 && (
                              <Badge variant="destructive">{item.errorCount} ошибок</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройки выполнения</DialogTitle>
                  <DialogDescription>
                    Настройте параметры подключения и выполнения
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Таймаут подключения (мс)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-md"
                        value={executionSettings.connectionTimeout}
                        onChange={(e) =>
                          updateExecutionSettings({
                            connectionTimeout: parseInt(e.target.value) || 30000,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Таймаут команды (мс)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-md"
                        value={executionSettings.commandTimeout}
                        onChange={(e) =>
                          updateExecutionSettings({
                            commandTimeout: parseInt(e.target.value) || 60000,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Максимум одновременных подключений
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      className="w-full"
                      value={executionSettings.maxConcurrent}
                      onChange={(e) =>
                        updateExecutionSettings({
                          maxConcurrent: parseInt(e.target.value),
                        })
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span className="font-medium text-foreground">
                        {executionSettings.maxConcurrent}
                      </span>
                      <span>100</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Режим добивания</h4>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm">Включить повторы</span>
                      <input
                        type="checkbox"
                        checked={executionSettings.retryEnabled}
                        onChange={(e) =>
                          updateExecutionSettings({ retryEnabled: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                    </div>

                    {executionSettings.retryEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm">Попыток</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            className="w-full px-3 py-2 border rounded-md"
                            value={executionSettings.retryAttempts}
                            onChange={(e) =>
                              updateExecutionSettings({
                                retryAttempts: parseInt(e.target.value) || 3,
                              })
                            }
                            disabled={executionSettings.retryInfinite}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm">Задержка (мс)</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border rounded-md"
                            value={executionSettings.retryDelay}
                            onChange={(e) =>
                              updateExecutionSettings({
                                retryDelay: parseInt(e.target.value) || 5000,
                              })
                            }
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={executionSettings.retryInfinite}
                            onChange={(e) =>
                              updateExecutionSettings({ retryInfinite: e.target.checked })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Бесконечные повторы</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Пресеты */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center">
            <Zap className="w-4 h-4 mr-1" />
            Быстрые команды:
          </span>
          {presets.slice(0, 4).map((preset) => (
            <Badge
              key={preset.id}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => setCommand(preset.command)}
            >
              {preset.name}
            </Badge>
          ))}
          <Select onValueChange={handlePresetSelect}>
            <SelectTrigger className="w-[180px] h-6 text-xs">
              <SelectValue placeholder="Ещё пресеты..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Поле команды */}
        <div className="space-y-2">
          <Textarea
            placeholder="Введите команду для выполнения на выбранных хостах..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="font-mono min-h-[100px]"
            disabled={isExecuting || isRunning}
          />
        </div>

        {/* Прогресс */}
        {(isExecuting || isRunning) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                Выполнено {progress.completed} из {progress.total} хостов
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-green-500">Успех: {progress.success}</span>
              <span className="text-red-500">Ошибок: {progress.error}</span>
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex items-center gap-3">
          {isExecuting || isRunning ? (
            <Button variant="destructive" onClick={handleCancel} className="gap-2">
              <Square className="w-4 h-4" />
              Остановить
            </Button>
          ) : (
            <Button
              onClick={handleExecute}
              disabled={!command.trim() || selectedHosts.length === 0}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Выполнить
            </Button>
          )}

          <div className="text-sm text-muted-foreground">
            Выбрано хостов: <Badge variant="secondary">{selectedHosts.length}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
