// Глобальный store для SSH Manager

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Host,
  CommandResult,
  ExecutionSettings,
  AppSettings,
  CommandPreset,
  HostGroup,
  CommandHistory,
  HostStatus,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SSHStore {
  // Хосты
  hosts: Host[];
  addHosts: (hosts: Omit<Host, 'id' | 'status' | 'retryCount'>[]) => void;
  removeHost: (id: string) => void;
  removeHosts: (ids: string[]) => void;
  clearHosts: () => void;
  updateHost: (id: string, updates: Partial<Host>) => void;
  updateHostStatus: (id: string, status: HostStatus, error?: string) => void;
  setHosts: (hosts: Host[]) => void;

  // Результаты
  results: CommandResult[];
  addResult: (result: CommandResult) => void;
  clearResults: () => void;

  // Группы
  groups: HostGroup[];
  addGroup: (name: string, color: string) => void;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<HostGroup>) => void;

  // Пресеты команд
  presets: CommandPreset[];
  addPreset: (name: string, command: string, description?: string) => void;
  removePreset: (id: string) => void;
  updatePreset: (id: string, updates: Partial<CommandPreset>) => void;

  // История команд
  history: CommandHistory[];
  addHistory: (command: string, hostCount: number, successCount: number, errorCount: number) => void;
  clearHistory: () => void;

  // Настройки выполнения
  executionSettings: ExecutionSettings;
  updateExecutionSettings: (settings: Partial<ExecutionSettings>) => void;

  // Настройки приложения
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => void;

  // Состояние выполнения
  isExecuting: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  currentCommand: string;
  progress: {
    total: number;
    completed: number;
    success: number;
    error: number;
  };
  setActiveHost: (hostId: string | null) => void;
  activeHostId: string | null;

  // Управление выполнением
  startExecution: (command: string) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  cancelExecution: () => void;
  finishExecution: () => void;
  updateProgress: (updates: Partial<typeof SSHStore.prototype.progress>) => void;
  resetProgress: () => void;

  // Режим добивания
  retryQueue: string[];
  addToRetryQueue: (hostId: string) => void;
  removeFromRetryQueue: (hostId: string) => void;
  clearRetryQueue: () => void;

  // Фильтрация
  filter: {
    search: string;
    status: HostStatus | 'all';
    group: string | 'all';
  };
  setFilter: (filter: Partial<typeof SSHStore.prototype.filter>) => void;

  // Выбранные хосты
  selectedHosts: string[];
  selectHost: (id: string) => void;
  deselectHost: (id: string) => void;
  selectAllHosts: () => void;
  deselectAllHosts: () => void;
  toggleHostSelection: (id: string) => void;
}

const defaultExecutionSettings: ExecutionSettings = {
  connectionTimeout: 30000,
  commandTimeout: 60000,
  maxConcurrent: 30,
  retryEnabled: true,
  retryAttempts: 3,
  retryDelay: 5000,
  retryInfinite: false,
};

const defaultAppSettings: AppSettings = {
  saveHosts: true,
  encryptKeys: true,
  maxHistoryCommands: 100,
  theme: 'system',
  language: 'ru',
};

export const useSSHStore = create<SSHStore>()(
  persist(
    (set, get) => ({
      // Хосты
      hosts: [],
      addHosts: (newHosts) => {
        const hosts = get().hosts;
        const hostsWithIds: Host[] = newHosts.map((h) => ({
          ...h,
          id: uuidv4(),
          status: 'idle' as HostStatus,
          retryCount: 0,
        }));
        
        // Фильтруем дубликаты
        const uniqueHosts = hostsWithIds.filter(
          (newHost) => !hosts.some(
            (existing) => existing.ip === newHost.ip && existing.port === newHost.port
          )
        );
        
        set({ hosts: [...hosts, ...uniqueHosts] });
      },
      removeHost: (id) => set((state) => ({
        hosts: state.hosts.filter((h) => h.id !== id),
        selectedHosts: state.selectedHosts.filter((sid) => sid !== id),
      })),
      removeHosts: (ids) => set((state) => ({
        hosts: state.hosts.filter((h) => !ids.includes(h.id)),
        selectedHosts: state.selectedHosts.filter((sid) => !ids.includes(sid)),
      })),
      clearHosts: () => set({ hosts: [], selectedHosts: [] }),
      updateHost: (id, updates) => set((state) => ({
        hosts: state.hosts.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      })),
      updateHostStatus: (id, status, error) => set((state) => ({
        hosts: state.hosts.map((h) =>
          h.id === id
            ? { ...h, status, lastError: error, retryCount: status === 'retrying' ? h.retryCount + 1 : h.retryCount }
            : h
        ),
      })),
      setHosts: (hosts) => set({ hosts }),

      // Результаты
      results: [],
      addResult: (result) => set((state) => ({
        results: [...state.results, result],
        hosts: state.hosts.map((h) =>
          h.id === result.hostId ? { ...h, status: result.success ? 'success' : 'error', lastResult: result } : h
        ),
      })),
      clearResults: () => set({ results: [] }),

      // Группы
      groups: [],
      addGroup: (name, color) => set((state) => ({
        groups: [...state.groups, { id: uuidv4(), name, color, hostIds: [] }],
      })),
      removeGroup: (id) => set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        hosts: state.hosts.map((h) => (h.group === id ? { ...h, group: undefined } : h)),
      })),
      updateGroup: (id, updates) => set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      })),

      // Пресеты
      presets: [
        { id: '1', name: 'Проверка uptime', command: 'uptime', description: 'Показать время работы системы', createdAt: new Date() },
        { id: '2', name: 'Свободное место', command: 'df -h', description: 'Показать использование диска', createdAt: new Date() },
        { id: '3', name: 'Загрузка системы', command: 'top -bn1 | head -5', description: 'Показать топ процессов', createdAt: new Date() },
        { id: '4', name: 'Сетевые соединения', command: 'ss -tunlp', description: 'Список сетевых соединений', createdAt: new Date() },
      ],
      addPreset: (name, command, description) => set((state) => ({
        presets: [...state.presets, { id: uuidv4(), name, command, description, createdAt: new Date() }],
      })),
      removePreset: (id) => set((state) => ({
        presets: state.presets.filter((p) => p.id !== id),
      })),
      updatePreset: (id, updates) => set((state) => ({
        presets: state.presets.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),

      // История
      history: [],
      addHistory: (command, hostCount, successCount, errorCount) => set((state) => {
        const newHistory = [
          { id: uuidv4(), command, executedAt: new Date(), hostCount, successCount, errorCount },
          ...state.history,
        ].slice(0, state.appSettings.maxHistoryCommands);
        return { history: newHistory };
      }),
      clearHistory: () => set({ history: [] }),

      // Настройки выполнения
      executionSettings: defaultExecutionSettings,
      updateExecutionSettings: (settings) => set((state) => ({
        executionSettings: { ...state.executionSettings, ...settings },
      })),

      // Настройки приложения
      appSettings: defaultAppSettings,
      updateAppSettings: (settings) => set((state) => ({
        appSettings: { ...state.appSettings, ...settings },
      })),

      // Состояние выполнения
      isExecuting: false,
      isPaused: false,
      isCancelled: false,
      currentCommand: '',
      progress: { total: 0, completed: 0, success: 0, error: 0 },
      activeHostId: null,
      setActiveHost: (hostId) => set({ activeHostId: hostId }),

      // Управление выполнением
      startExecution: (command) => set({
        isExecuting: true,
        isPaused: false,
        isCancelled: false,
        currentCommand: command,
        progress: { total: get().selectedHosts.length, completed: 0, success: 0, error: 0 },
      }),
      pauseExecution: () => set({ isPaused: true }),
      resumeExecution: () => set({ isPaused: false }),
      cancelExecution: () => set({ isCancelled: true, isExecuting: false, isPaused: false }),
      finishExecution: () => set({ isExecuting: false, isPaused: false }),
      updateProgress: (updates) => set((state) => ({
        progress: { ...state.progress, ...updates },
      })),
      resetProgress: () => set({
        progress: { total: 0, completed: 0, success: 0, error: 0 },
        activeHostId: null,
      }),

      // Режим добивания
      retryQueue: [],
      addToRetryQueue: (hostId) => set((state) => ({
        retryQueue: state.retryQueue.includes(hostId) ? state.retryQueue : [...state.retryQueue, hostId],
      })),
      removeFromRetryQueue: (hostId) => set((state) => ({
        retryQueue: state.retryQueue.filter((id) => id !== hostId),
      })),
      clearRetryQueue: () => set({ retryQueue: [] }),

      // Фильтрация
      filter: { search: '', status: 'all', group: 'all' },
      setFilter: (filter) => set((state) => ({
        filter: { ...state.filter, ...filter },
      })),

      // Выбранные хосты
      selectedHosts: [],
      selectHost: (id) => set((state) => ({
        selectedHosts: state.selectedHosts.includes(id) ? state.selectedHosts : [...state.selectedHosts, id],
      })),
      deselectHost: (id) => set((state) => ({
        selectedHosts: state.selectedHosts.filter((sid) => sid !== id),
      })),
      selectAllHosts: () => set((state) => ({
        selectedHosts: state.hosts.map((h) => h.id),
      })),
      deselectAllHosts: () => set({ selectedHosts: [] }),
      toggleHostSelection: (id) => set((state) => ({
        selectedHosts: state.selectedHosts.includes(id)
          ? state.selectedHosts.filter((sid) => sid !== id)
          : [...state.selectedHosts, id],
      })),
    }),
    {
      name: 'ssh-manager-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hosts: state.appSettings.saveHosts ? state.hosts : [],
        groups: state.groups,
        presets: state.presets,
        history: state.history,
        executionSettings: state.executionSettings,
        appSettings: state.appSettings,
      }),
    }
  )
);

// Селекторы
export const useFilteredHosts = () => {
  const { hosts, filter } = useSSHStore();
  
  return hosts.filter((host) => {
    // Фильтр по поиску
    if (filter.search) {
      const search = filter.search.toLowerCase();
      if (
        !host.ip.toLowerCase().includes(search) &&
        !host.username.toLowerCase().includes(search) &&
        !host.name?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    
    // Фильтр по статусу
    if (filter.status !== 'all' && host.status !== filter.status) {
      return false;
    }
    
    // Фильтр по группе
    if (filter.group !== 'all' && host.group !== filter.group) {
      return false;
    }
    
    return true;
  });
};

export const useSelectedHosts = () => {
  const { hosts, selectedHosts } = useSSHStore();
  return hosts.filter((h) => selectedHosts.includes(h.id));
};

export const useExecutionStats = () => {
  const { hosts, progress } = useSSHStore();
  const pending = hosts.filter((h) => h.status === 'idle' || h.status === 'retrying').length;
  const connecting = hosts.filter((h) => h.status === 'connecting').length;
  const executing = hosts.filter((h) => h.status === 'executing').length;
  const success = hosts.filter((h) => h.status === 'success').length;
  const error = hosts.filter((h) => h.status === 'error').length;
  
  return { pending, connecting, executing, success, error, total: progress.total };
};
