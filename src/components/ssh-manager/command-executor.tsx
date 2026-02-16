'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Square,
  Settings,
  History,
  Zap,
  Terminal,
  CheckCircle2,
  XCircle,
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
    selectAllHosts,
    hosts,
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

  // Проверка есть ли хосты, но ни один не выбран
  const hasHostsButNoneSelected = hosts.length > 0 && selectedHosts.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="w-4 h-4" />
              Выполнение команд
            </CardTitle>
            <CardDescription className="text-xs">
              Введите команду и нажмите выполнить
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <History className="w-3 h-3 mr-1" />
                  История
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>История команд</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[250px]">
                  {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      История пуста
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded border hover:bg-muted/50 cursor-pointer text-sm"
                          onClick={() => {
                            setCommand(item.command);
                            setShowHistory(false);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-xs font-mono truncate flex-1">{item.command}</code>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {new Date(item.executedAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <div className="flex gap-1 text-[10px]">
                            <Badge variant="outline" className="h-4 px-1">{item.hostCount} хостов</Badge>
                            <Badge className="h-4 px-1 bg-green-500">{item.successCount} ✓</Badge>
                            {item.errorCount > 0 && (
                              <Badge variant="destructive" className="h-4 px-1">{item.errorCount} ✗</Badge>
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
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Настройки
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Настройки выполнения</DialogTitle>
                  <DialogDescription className="text-xs">
                    Параметры подключения и режим добивания
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3 py-2">
                  {/* Таймауты - компактно */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Таймаут подкл. (мс)</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        value={executionSettings.connectionTimeout}
                        onChange={(e) =>
                          updateExecutionSettings({
                            connectionTimeout: parseInt(e.target.value) || 30000,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Таймаут команды (мс)</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        value={executionSettings.commandTimeout}
                        onChange={(e) =>
                          updateExecutionSettings({
                            commandTimeout: parseInt(e.target.value) || 60000,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Параллелизм */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <Label>Параллельных подключений</Label>
                      <span className="font-medium">{executionSettings.maxConcurrent}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      className="w-full h-2"
                      value={executionSettings.maxConcurrent}
                      onChange={(e) =>
                        updateExecutionSettings({
                          maxConcurrent: parseInt(e.target.value),
                        })
                      }
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Режим добивания */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Режим добивания</Label>
                      <Switch
                        checked={executionSettings.retryEnabled}
                        onCheckedChange={(checked) =>
                          updateExecutionSettings({ retryEnabled: checked })
                        }
                      />
                    </div>

                    {executionSettings.retryEnabled && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Попыток</Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            className="h-8 text-sm"
                            value={executionSettings.retryAttempts}
                            onChange={(e) =>
                              updateExecutionSettings({
                                retryAttempts: parseInt(e.target.value) || 3,
                              })
                            }
                            disabled={executionSettings.retryInfinite}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Задержка (мс)</Label>
                          <Input
                            type="number"
                            className="h-8 text-sm"
                            value={executionSettings.retryDelay}
                            onChange={(e) =>
                              updateExecutionSettings({
                                retryDelay: parseInt(e.target.value) || 5000,
                              })
                            }
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            checked={executionSettings.retryInfinite}
                            onCheckedChange={(checked) =>
                              updateExecutionSettings({ retryInfinite: checked })
                            }
                          />
                          <Label className="text-xs">Бесконечные повторы</Label>
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

      <CardContent className="space-y-3">
        {/* Пресеты */}
        <div className="flex flex-wrap items-center gap-1">
          <Zap className="w-3 h-3 text-muted-foreground" />
          {presets.slice(0, 4).map((preset) => (
            <Badge
              key={preset.id}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 text-xs px-2 py-0.5"
              onClick={() => setCommand(preset.command)}
            >
              {preset.name}
            </Badge>
          ))}
          <Select onValueChange={handlePresetSelect}>
            <SelectTrigger className="w-[100px] h-5 text-[10px]">
              <SelectValue placeholder="Ещё..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Поле команды */}
        <Textarea
          placeholder="Введите команду... (например: uptime, df -h, systemctl status nginx)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="font-mono text-sm min-h-[80px]"
          disabled={isExecuting || isRunning}
        />

        {/* Прогресс */}
        {(isExecuting || isRunning) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Выполнено {progress.completed} из {progress.total}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <div className="flex justify-between text-[10px]">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {progress.success}
              </span>
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {progress.error}
              </span>
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex items-center gap-2">
          {isExecuting || isRunning ? (
            <Button variant="destructive" size="sm" onClick={handleCancel} className="gap-1">
              <Square className="w-3 h-3" />
              Стоп
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={!command.trim() || selectedHosts.length === 0}
                className="gap-1"
              >
                <Play className="w-3 h-3" />
                Выполнить
              </Button>
              {hasHostsButNoneSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllHosts}
                  className="gap-1 text-xs"
                >
                  Выбрать все ({hosts.length})
                </Button>
              )}
            </>
          )}

          <div className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            Выбрано: <Badge variant="secondary" className="h-5 px-1.5 text-xs">{selectedHosts.length}</Badge>
            {hasHostsButNoneSelected && (
              <span className="text-orange-500 text-[10px]">• не выбрано</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
