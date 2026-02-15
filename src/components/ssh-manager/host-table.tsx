'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
  Ban,
} from 'lucide-react';
import { useSSHStore, useFilteredHosts, useExecutionStats } from '@/store/ssh-store';
import { Host, HostStatus } from '@/types';

const statusConfig: Record<HostStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Ожидание', color: 'bg-gray-500', icon: <Clock className="w-3 h-3" /> },
  connecting: { label: 'Подключение', color: 'bg-yellow-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  connected: { label: 'Подключено', color: 'bg-blue-500', icon: <Wifi className="w-3 h-3" /> },
  executing: { label: 'Выполнение', color: 'bg-orange-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  success: { label: 'Успех', color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> },
  error: { label: 'Ошибка', color: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
  retrying: { label: 'Повтор', color: 'bg-purple-500', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  cancelled: { label: 'Отменено', color: 'bg-gray-400', icon: <Ban className="w-3 h-3" /> },
};

export function HostTable() {
  const {
    hosts,
    selectedHosts,
    filter,
    setFilter,
    toggleHostSelection,
    selectAllHosts,
    deselectAllHosts,
    removeHosts,
    isExecuting,
  } = useSSHStore();
  
  const filteredHosts = useFilteredHosts();
  const stats = useExecutionStats();

  const handleSelectAll = () => {
    if (selectedHosts.length === filteredHosts.length) {
      deselectAllHosts();
    } else {
      selectAllHosts();
    }
  };

  const handleDeleteSelected = () => {
    if (selectedHosts.length > 0) {
      removeHosts(selectedHosts);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Панель инструментов */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-muted/30">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по IP, имени..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filter.status}
          onValueChange={(value) => setFilter({ status: value as HostStatus | 'all' })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={selectedHosts.length === 0 || isExecuting}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Удалить ({selectedHosts.length})
        </Button>

        {/* Статистика */}
        <div className="flex items-center gap-4 ml-auto text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span>Ожидание: {stats.pending}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Успех: {stats.success}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Ошибка: {stats.error}</span>
          </div>
          <div className="font-medium">
            Всего: {hosts.length}
          </div>
        </div>
      </div>

      {/* Таблица */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedHosts.length === filteredHosts.length && filteredHosts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead>IP адрес</TableHead>
              <TableHead>Порт</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Аутентификация</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Попыток</TableHead>
              <TableHead>Ошибка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {hosts.length === 0
                    ? 'Нет хостов. Загрузите файл или добавьте вручную.'
                    : 'Нет хостов, соответствующих фильтру.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredHosts.map((host, index) => (
                <TableRow
                  key={host.id}
                  className={selectedHosts.includes(host.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedHosts.includes(host.id)}
                      onCheckedChange={() => toggleHostSelection(host.id)}
                      disabled={isExecuting}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {host.status === 'success' ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : host.status === 'error' ? (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      ) : null}
                      <span className="font-mono">{host.ip}</span>
                      {host.name && (
                        <span className="text-muted-foreground text-sm">
                          ({host.name})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{host.port}</TableCell>
                  <TableCell>{host.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {host.authType === 'password' ? 'Пароль' : 'SSH ключ'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge className={`${statusConfig[host.status].color} text-white gap-1`}>
                            {statusConfig[host.status].icon}
                            {statusConfig[host.status].label}
                          </Badge>
                        </TooltipTrigger>
                        {host.lastError && (
                          <TooltipContent className="max-w-[300px]">
                            <p className="text-red-300">{host.lastError}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-center">
                    {host.retryCount > 0 ? (
                      <span className="text-orange-500">{host.retryCount}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {host.lastError ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p>{host.lastError}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
