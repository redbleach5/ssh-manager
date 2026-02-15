'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Settings, Database, Shield, Palette, Globe, Trash2 } from 'lucide-react';
import { useSSHStore } from '@/store/ssh-store';

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const {
    appSettings,
    updateAppSettings,
    executionSettings,
    updateExecutionSettings,
    clearHosts,
    clearHistory,
    hosts,
    history,
  } = useSSHStore();

  const handleClearAll = () => {
    if (confirm('Вы уверены? Это удалит все хосты и историю.')) {
      clearHosts();
      clearHistory();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки приложения
          </DialogTitle>
          <DialogDescription>
            Настройте параметры SSH Manager
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Данные */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="w-4 h-4" />
              Хранение данных
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Сохранять хосты</Label>
                <p className="text-xs text-muted-foreground">
                  Сохранять список хостов между сессиями
                </p>
              </div>
              <Switch
                checked={appSettings.saveHosts}
                onCheckedChange={(checked) => updateAppSettings({ saveHosts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Шифровать ключи</Label>
                <p className="text-xs text-muted-foreground">
                  Хранить SSH ключи в зашифрованном виде
                </p>
              </div>
              <Switch
                checked={appSettings.encryptKeys}
                onCheckedChange={(checked) => updateAppSettings({ encryptKeys: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>История команд (макс. записей)</Label>
              <Input
                type="number"
                min={10}
                max={1000}
                value={appSettings.maxHistoryCommands}
                onChange={(e) =>
                  updateAppSettings({ maxHistoryCommands: parseInt(e.target.value) || 100 })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Выполнение по умолчанию */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4" />
              Параметры выполнения
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Таймаут подключения (мс)</Label>
                <Input
                  type="number"
                  value={executionSettings.connectionTimeout}
                  onChange={(e) =>
                    updateExecutionSettings({ connectionTimeout: parseInt(e.target.value) || 30000 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Таймаут команды (мс)</Label>
                <Input
                  type="number"
                  value={executionSettings.commandTimeout}
                  onChange={(e) =>
                    updateExecutionSettings({ commandTimeout: parseInt(e.target.value) || 60000 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Максимум параллельных подключений</Label>
              <Input
                type="range"
                min={1}
                max={100}
                value={executionSettings.maxConcurrent}
                onChange={(e) =>
                  updateExecutionSettings({ maxConcurrent: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span className="font-medium">{executionSettings.maxConcurrent}</span>
                <span>100</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Интерфейс */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="w-4 h-4" />
              Интерфейс
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Тема</Label>
              </div>
              <Select
                value={appSettings.theme}
                onValueChange={(value) =>
                  updateAppSettings({ theme: value as 'light' | 'dark' | 'system' })
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Светлая</SelectItem>
                  <SelectItem value="dark">Тёмная</SelectItem>
                  <SelectItem value="system">Системная</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Язык</Label>
              </div>
              <Select
                value={appSettings.language}
                onValueChange={(value) =>
                  updateAppSettings({ language: value as 'ru' | 'en' })
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Статистика и очистка */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trash2 className="w-4 h-4" />
              Данные
            </div>

            <div className="flex justify-between text-sm">
              <span>Хостов:</span>
              <span className="font-medium">{hosts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Записей истории:</span>
              <span className="font-medium">{history.length}</span>
            </div>

            <Button variant="destructive" onClick={handleClearAll} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить все данные
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Готово</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
