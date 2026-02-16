'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  X,
  Lock,
  Key,
} from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useSSHStore } from '@/store/ssh-store';
import { ParseResult, AuthType, KeyFormat } from '@/types';
import { encryptSync } from '@/lib/crypto-utils';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingHosts, setPendingHosts] = useState<ParseResult | null>(null);
  
  // Общие креды для всех хостов из файла
  const [defaultUsername, setDefaultUsername] = useState('root');
  const [authType, setAuthType] = useState<AuthType>('password');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('openssh');
  const [passphrase, setPassphrase] = useState('');
  const [selectAllOnAdd, setSelectAllOnAdd] = useState(true);

  const { isLoading, error, parseResult, uploadFile, clearResult } = useFileUpload();
  const { addHosts, selectAllHosts } = useSSHStore();

  const processFile = useCallback(async (file: File) => {
    await uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const handleShowPreview = useCallback(() => {
    if (parseResult) {
      setPendingHosts(parseResult);
      setShowPreview(true);
    }
  }, [parseResult]);

  const handleConfirmAdd = useCallback(() => {
    if (pendingHosts) {
      // Применяем общие креды ко всем хостам
      const hosts = pendingHosts.hosts.map(h => ({
        ip: h.ip,
        port: h.port,
        name: h.name,
        // Применяем общие креды ко всем хостам
        username: defaultUsername,
        authType: authType,
        password: authType === 'password' && defaultPassword 
          ? encryptSync(defaultPassword) 
          : undefined,
        privateKey: authType === 'key' && privateKey 
          ? encryptSync(privateKey) 
          : undefined,
        keyFormat: authType === 'key' ? keyFormat : undefined,
        passphrase: authType === 'key' && passphrase 
          ? encryptSync(passphrase) 
          : undefined,
      }));
      
      addHosts(hosts);
      
      if (selectAllOnAdd) {
        setTimeout(() => selectAllHosts(), 100);
      }
      
      setShowPreview(false);
      setPendingHosts(null);
      clearResult();
      onUploadComplete?.();
    }
  }, [pendingHosts, defaultUsername, authType, defaultPassword, privateKey, keyFormat, passphrase, selectAllOnAdd, addHosts, selectAllHosts, clearResult, onUploadComplete]);

  const resetCredentials = () => {
    setDefaultUsername('root');
    setAuthType('password');
    setDefaultPassword('');
    setPrivateKey('');
    setKeyFormat('openssh');
    setPassphrase('');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4" />
            Загрузка хостов
          </CardTitle>
          <CardDescription className="text-xs">
            TXT, CSV, XLSX, XLS • Укажите креды для всех хостов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Поля кредов */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Логин *</Label>
              <Input
                placeholder="root"
                value={defaultUsername}
                onChange={(e) => setDefaultUsername(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Тип аутент.</Label>
              <Select value={authType} onValueChange={(v) => setAuthType(v as AuthType)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Пароль
                    </div>
                  </SelectItem>
                  <SelectItem value="key">
                    <div className="flex items-center gap-1">
                      <Key className="w-3 h-3" /> Ключ
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {authType === 'password' ? 'Пароль *' : 'Ключ'}
              </Label>
              {authType === 'password' ? (
                <Input
                  type="password"
                  placeholder="••••••"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => document.getElementById('key-file')?.click()}
                >
                  <Key className="w-3 h-3 mr-1" />
                  Выбрать файл
                </Button>
              )}
            </div>
          </div>

          {/* SSH ключ - textarea */}
          {authType === 'key' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={keyFormat} onValueChange={(v) => setKeyFormat(v as KeyFormat)}>
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openssh">OpenSSH</SelectItem>
                    <SelectItem value="putty">PuTTY PPK</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="password"
                  placeholder="Passphrase (опц.)"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="h-7 text-xs flex-1"
                />
              </div>
              <Textarea
                placeholder="Вставьте приватный ключ или выберите файл выше..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="font-mono text-xs min-h-[60px] h-16"
              />
              <input
                id="key-file"
                type="file"
                accept=".pem,.key,.ppk"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setPrivateKey(ev.target?.result as string);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
              />
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".txt,.csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
            
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Обработка...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Upload className="w-5 h-5" />
                <span className="text-sm">Перетащите файл или нажмите</span>
              </div>
            )}
          </div>

          {/* Результаты парсинга */}
          {parseResult && !showPreview && (
            <div className="space-y-2">
              <Alert className="py-2">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle className="text-sm">Файл обработан</AlertTitle>
                <AlertDescription className="text-xs">
                  Найдено: {parseResult.totalFound}, валидных: {parseResult.validCount}
                  {parseResult.errors.length > 0 && (
                    <span className="text-orange-500">, ошибок: {parseResult.errors.length}</span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleShowPreview} className="flex-1 h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить ({parseResult.validCount})
                </Button>
                <Button size="sm" variant="outline" onClick={() => { clearResult(); resetCredentials(); }} className="h-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <XCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Диалог превью */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Предпросмотр хостов</DialogTitle>
            <DialogDescription>
              Указанные креды будут применены ко всем хостам
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded p-2 text-xs">
            <strong>Креды для всех:</strong> Логин: <code className="font-bold">{defaultUsername}</code>, 
            {' '}{authType === 'password' ? (
              defaultPassword ? 'Пароль: ******' : <span className="text-red-500">Пароль: НЕ УКАЗАН!</span>
            ) : (
              privateKey ? 'SSH ключ: загружен' : <span className="text-red-500">SSH ключ: НЕ УКАЗАН!</span>
            )}
          </div>

          <div className="flex items-center gap-2 py-2 border-y">
            <Checkbox
              id="select-all"
              checked={selectAllOnAdd}
              onCheckedChange={(checked) => setSelectAllOnAdd(!!checked)}
            />
            <Label htmlFor="select-all" className="text-sm cursor-pointer">
              Автовыбор всех хостов для выполнения
            </Label>
          </div>

          <ScrollArea className="flex-1 max-h-[30vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">IP</th>
                  <th className="text-left p-2">Порт</th>
                  {pendingHosts?.hosts.some(h => h.name) && (
                    <th className="text-left p-2">Имя</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pendingHosts?.hosts.map((host, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-mono">{host.ip}</td>
                    <td className="p-2">{host.port}</td>
                    {pendingHosts.hosts.some(h => h.name) && (
                      <td className="p-2 text-muted-foreground">{host.name || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          {/* Ошибки парсинга */}
          {pendingHosts?.errors && pendingHosts.errors.length > 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Ошибки при обработке</AlertTitle>
              <AlertDescription>
                <ScrollArea className="max-h-16">
                  <ul className="list-disc pl-4 text-xs">
                    {pendingHosts.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {pendingHosts.errors.length > 5 && (
                      <li>...и ещё {pendingHosts.errors.length - 5} ошибок</li>
                    )}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleConfirmAdd}
              disabled={(authType === 'password' && !defaultPassword) || (authType === 'key' && !privateKey)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить {pendingHosts?.validCount || 0} хостов
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
