'use client';

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
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { useSSHStore, useFilteredHosts, useExecutionStats } from '@/store/ssh-store';
import { HostStatus } from '@/types';

const statusConfig: Record<HostStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Ожидание', color: 'bg-gray-400', icon: <Clock className="w-3 h-3" /> },
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
      // Выбираем только отфильтрованные
      filteredHosts.forEach(h => {
        if (!selectedHosts.includes(h.id)) {
          toggleHostSelection(h.id);
        }
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedHosts.length > 0) {
      removeHosts(selectedHosts);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Панель инструментов - компактная */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-muted/30">
        <div className="relative flex-1 min-w-[150px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="pl-7 h-7 text-xs"
          />
        </div>

        <Select
          value={filter.status}
          onValueChange={(value) => setFilter({ status: value as HostStatus | 'all' })}
        >
          <SelectTrigger className="w-[100px] h-7 text-xs">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-1 text-xs">
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
          className="h-7 text-xs gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Удалить ({selectedHosts.length})
        </Button>

        {/* Статистика - компактная */}
        <div className="flex items-center gap-2 ml-auto text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span>{stats.pending}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{stats.success}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>{stats.error}</span>
          </div>
          <div className="font-medium border-l pl-2 ml-1">
            Всего: {hosts.length}
          </div>
        </div>
      </div>

      {/* Таблица */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 p-1">
                <Checkbox
                  checked={selectedHosts.length === filteredHosts.length && filteredHosts.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4"
                />
              </TableHead>
              <TableHead className="w-8 p-1 text-[10px]">#</TableHead>
              <TableHead className="p-1 text-[10px]">IP адрес</TableHead>
              <TableHead className="w-12 p-1 text-[10px]">Порт</TableHead>
              <TableHead className="w-20 p-1 text-[10px]">Пользователь</TableHead>
              <TableHead className="w-16 p-1 text-[10px]">Аутент.</TableHead>
              <TableHead className="w-24 p-1 text-[10px]">Статус</TableHead>
              <TableHead className="w-8 p-1 text-[10px]">Попыток</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                  {hosts.length === 0
                    ? 'Нет хостов. Загрузите файл или добавьте вручную.'
                    : 'Нет хостов, соответствующих фильтру.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredHosts.map((host, index) => (
                <TableRow
                  key={host.id}
                  className={`${selectedHosts.includes(host.id) ? 'bg-primary/5' : ''} hover:bg-muted/30`}
                >
                  <TableCell className="p-1">
                    <Checkbox
                      checked={selectedHosts.includes(host.id)}
                      onCheckedChange={() => toggleHostSelection(host.id)}
                      disabled={isExecuting}
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell className="p-1 font-mono text-[10px] text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="flex items-center gap-1">
                      {host.status === 'success' ? (
                        <Wifi className="w-3 h-3 text-green-500" />
                      ) : host.status === 'error' ? (
                        <WifiOff className="w-3 h-3 text-red-500" />
                      ) : null}
                      <span className="font-mono text-xs">{host.ip}</span>
                      {host.name && (
                        <span className="text-muted-foreground text-[10px] truncate max-w-[60px]">
                          ({host.name})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-1 font-mono text-xs">{host.port}</TableCell>
                  <TableCell className="p-1 text-xs">{host.username}</TableCell>
                  <TableCell className="p-1">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {host.authType === 'password' ? 'Пароль' : 'Ключ'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge className={`${statusConfig[host.status].color} text-white gap-0.5 text-[10px] h-4 px-1`}>
                            {statusConfig[host.status].icon}
                            {statusConfig[host.status].label}
                          </Badge>
                        </TooltipTrigger>
                        {host.lastError && (
                          <TooltipContent className="max-w-[250px] text-xs">
                            <p className="text-red-300">{host.lastError}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="p-1 text-center text-xs">
                    {host.retryCount > 0 ? (
                      <span className="text-orange-500">{host.retryCount}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
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
