'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Key, Lock, Upload, FileKey } from 'lucide-react';
import { useSSHStore } from '@/store/ssh-store';
import { encryptSync } from '@/lib/crypto-utils';
import { AuthType, KeyFormat } from '@/types';

export function AddHostForm() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single host
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState<AuthType>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('openssh');
  const [passphrase, setPassphrase] = useState('');
  const [name, setName] = useState('');

  // Bulk
  const [bulkText, setBulkText] = useState('');
  const [bulkAuthType, setBulkAuthType] = useState<AuthType>('password');
  const [bulkPassword, setBulkPassword] = useState('');
  const [bulkKey, setBulkKey] = useState('');
  const [bulkKeyFormat, setBulkKeyFormat] = useState<KeyFormat>('openssh');
  const [bulkPassphrase, setBulkPassphrase] = useState('');

  const { addHosts, selectAllHosts } = useSSHStore();

  const handleAddSingle = () => {
    if (!ip.trim()) return;

    const newHost = {
      ip: ip.trim(),
      port: parseInt(port) || 22,
      username: username.trim() || 'root',
      authType,
      password: authType === 'password' && password ? encryptSync(password) : undefined,
      privateKey: authType === 'key' && privateKey ? encryptSync(privateKey) : undefined,
      keyFormat: authType === 'key' ? keyFormat : undefined,
      passphrase: authType === 'key' && passphrase ? encryptSync(passphrase) : undefined,
      name: name.trim() || undefined,
    };

    addHosts([newHost]);
    resetForm();
    setOpen(false);
    // Автовыбор добавленного хоста
    setTimeout(() => selectAllHosts(), 100);
  };

  const handleAddBulk = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter((l) => l.trim());
    const newHosts: Parameters<typeof addHosts>[0] = [];

    for (const line of lines) {
      const parts = line.split(/[\s,;]+/).filter((p) => p.trim());
      if (parts.length === 0) continue;

      const ipPart = parts[0];
      const [ipAddr, portPart] = ipPart.split(':');
      const parsedPort = portPart ? parseInt(portPart) : 22;

      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipAddr)) continue;

      // Если есть пароль в строке - используем его, иначе используем общие креды
      const hasPassword = parts.length >= 3 && parts[2];
      
      newHosts.push({
        ip: ipAddr,
        port: parsedPort,
        username: parts[1] || 'root',
        password: hasPassword 
          ? encryptSync(parts[2])
          : bulkAuthType === 'password' && bulkPassword 
            ? encryptSync(bulkPassword) 
            : undefined,
        privateKey: bulkAuthType === 'key' && bulkKey ? encryptSync(bulkKey) : undefined,
        keyFormat: bulkAuthType === 'key' ? bulkKeyFormat : undefined,
        passphrase: bulkAuthType === 'key' && bulkPassphrase ? encryptSync(bulkPassphrase) : undefined,
        authType: hasPassword ? 'password' : bulkAuthType,
      });
    }

    if (newHosts.length > 0) {
      addHosts(newHosts);
      setBulkText('');
      setOpen(false);
      setTimeout(() => selectAllHosts(), 100);
    }
  };

  const resetForm = () => {
    setIp('');
    setPort('22');
    setUsername('root');
    setAuthType('password');
    setPassword('');
    setPrivateKey('');
    setKeyFormat('openssh');
    setPassphrase('');
    setName('');
    setBulkText('');
    setBulkAuthType('password');
    setBulkPassword('');
    setBulkKey('');
    setBulkPassphrase('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Добавление хостов</DialogTitle>
          <DialogDescription>
            Добавьте хосты для управления
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="single" className="text-xs">Один хост</TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs">Массовое</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 mt-3">
            {/* IP и порт */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">IP адрес *</Label>
                <Input
                  placeholder="192.168.1.1"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Порт</Label>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Пользователь и название */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Пользователь</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Название (опц.)</Label>
                <Input
                  placeholder="Web Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Аутентификация */}
            <div className="grid grid-cols-2 gap-2">
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
                        <Key className="w-3 h-3" /> SSH ключ
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  {authType === 'password' ? 'Пароль' : 'Формат ключа'}
                </Label>
                {authType === 'password' ? (
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-8 text-sm"
                  />
                ) : (
                  <Select value={keyFormat} onValueChange={(v) => setKeyFormat(v as KeyFormat)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openssh">OpenSSH</SelectItem>
                      <SelectItem value="putty">PuTTY PPK</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* SSH ключ */}
            {authType === 'key' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => document.getElementById('key-file-single')?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Выбрать файл
                  </Button>
                  <Input
                    type="password"
                    placeholder="Passphrase (опц.)"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                </div>
                <Textarea
                  placeholder="Вставьте приватный ключ..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="font-mono text-xs min-h-[80px]"
                />
                <input
                  id="key-file-single"
                  type="file"
                  accept=".pem,.key,.ppk"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setPrivateKey(ev.target?.result as string);
                      reader.readAsText(file);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleAddSingle} disabled={!ip.trim()}>
                <Plus className="w-3 h-3 mr-1" />
                Добавить
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 mt-3">
            {/* Общие креды */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Тип аутент.</Label>
                <Select value={bulkAuthType} onValueChange={(v) => setBulkAuthType(v as AuthType)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">
                      <div className="flex items-center gap-1 text-xs">
                        <Lock className="w-3 h-3" /> Пароль
                      </div>
                    </SelectItem>
                    <SelectItem value="key">
                      <div className="flex items-center gap-1 text-xs">
                        <Key className="w-3 h-3" /> Ключ
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">
                  {bulkAuthType === 'password' ? 'Пароль (общий)' : 'Формат ключа'}
                </Label>
                {bulkAuthType === 'password' ? (
                  <Input
                    type="password"
                    placeholder="Общий пароль"
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    className="h-7 text-xs"
                  />
                ) : (
                  <Select value={bulkKeyFormat} onValueChange={(v) => setBulkKeyFormat(v as KeyFormat)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openssh">OpenSSH</SelectItem>
                      <SelectItem value="putty">PuTTY PPK</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* SSH ключ для bulk */}
            {bulkAuthType === 'key' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => document.getElementById('key-file-bulk')?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Выбрать файл
                  </Button>
                  <Input
                    type="password"
                    placeholder="Passphrase (опц.)"
                    value={bulkPassphrase}
                    onChange={(e) => setBulkPassphrase(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                </div>
                <Textarea
                  placeholder="Приватный ключ для всех хостов..."
                  value={bulkKey}
                  onChange={(e) => setBulkKey(e.target.value)}
                  className="font-mono text-xs min-h-[60px]"
                />
                <input
                  id="key-file-bulk"
                  type="file"
                  accept=".pem,.key,.ppk"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setBulkKey(ev.target?.result as string);
                      reader.readAsText(file);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}

            {/* Формат и textarea */}
            <div className="text-[10px] text-muted-foreground">
              Формат: <code>IP [user] [password]</code> • По одному на строку
            </div>
            
            <Textarea
              placeholder={`192.168.1.1
192.168.1.2 admin password123
192.168.1.3:2222 root`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="font-mono text-xs min-h-[120px]"
            />

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleAddBulk} disabled={!bulkText.trim()}>
                <Plus className="w-3 h-3 mr-1" />
                Добавить
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
