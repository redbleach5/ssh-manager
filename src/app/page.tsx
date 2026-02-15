'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Server,
  Terminal,
  FileUp,
  History,
  Settings,
  Wifi,
  WifiOff,
  Activity,
  Monitor,
} from 'lucide-react';
import { useSSHStore, useExecutionStats } from '@/store/ssh-store';
import { HostTable } from '@/components/ssh-manager/host-table';
import { FileUpload } from '@/components/ssh-manager/file-upload';
import { AddHostForm } from '@/components/ssh-manager/add-host-form';
import { CommandExecutor } from '@/components/ssh-manager/command-executor';
import { ResultsPanel } from '@/components/ssh-manager/results-panel';
import { SettingsPanel } from '@/components/ssh-manager/settings-panel';

export default function SSHManagerPage() {
  const { hosts, selectedHosts, isExecuting, progress } = useSSHStore();
  const stats = useExecutionStats();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Загрузка SSH Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">SSH Manager</h1>
                <p className="text-xs text-muted-foreground">
                  Массовое управление серверами
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Статус */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <span>Хостов:</span>
                  <Badge variant="secondary">{hosts.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isExecuting ? (
                    <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
                  ) : stats.error > 0 ? (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  ) : stats.success > 0 ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <Wifi className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>Выбрано:</span>
                  <Badge variant="secondary">{selectedHosts.length}</Badge>
                </div>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Прогресс выполнения */}
              {isExecuting && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              )}

              <SettingsPanel />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4">
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-120px)] rounded-lg border">
          {/* Left Panel - Hosts */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span className="font-medium">Хосты</span>
                </div>
                <div className="flex gap-2">
                  <AddHostForm />
                </div>
              </div>

              {/* Host Table */}
              <div className="flex-1 overflow-hidden">
                <HostTable />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <Tabs defaultValue="execute" className="h-full flex flex-col">
              <div className="border-b px-2 pt-2 bg-muted/30">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="execute" className="gap-2">
                    <Terminal className="w-4 h-4" />
                    Выполнение
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <FileUp className="w-4 h-4" />
                    Загрузка
                  </TabsTrigger>
                  <TabsTrigger value="results" className="gap-2">
                    <History className="w-4 h-4" />
                    Результаты
                    {useSSHStore.getState().results.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {useSSHStore.getState().results.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <TabsContent value="execute" className="m-0 h-full">
                  <CommandExecutor />
                </TabsContent>

                <TabsContent value="upload" className="m-0">
                  <FileUpload />
                </TabsContent>

                <TabsContent value="results" className="m-0 h-full">
                  <ResultsPanel />
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>SSH Manager v1.0</span>
              <Separator orientation="vertical" className="h-3" />
              <span>Параллельных подключений: {useSSHStore.getState().executionSettings.maxConcurrent}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Готов к работе
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
