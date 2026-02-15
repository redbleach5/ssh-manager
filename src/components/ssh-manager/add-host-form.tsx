'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  const { addHosts, hosts } = useSSHStore();

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
  };

  const handleAddBulk = () => {
    if (!bulkText.trim()) return;

    // Парсим построчно
    const lines = bulkText.split('\n').filter((l) => l.trim());
    const newHosts: Parameters<typeof addHosts>[0] = [];

    for (const line of lines) {
      const parts = line.split(/[\s,;]+/).filter((p) => p.trim());
      if (parts.length === 0) continue;

      // IP с возможным портом
      const ipPart = parts[0];
      const [ipAddr, portPart] = ipPart.split(':');
      const parsedPort = portPart ? parseInt(portPart) : 22;

      // Валидация IP (базовая)
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipAddr)) continue;

      newHosts.push({
        ip: ipAddr,
        port: parsedPort,
        username: parts[1] || 'root',
        password: parts[2] ? encryptSync(parts[2]) : undefined,
        authType: parts[2] ? 'password' : 'key',
      });
    }

    if (newHosts.length > 0) {
      addHosts(newHosts);
      setBulkText('');
      setOpen(false);
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить хост
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавление хостов</DialogTitle>
          <DialogDescription>
            Добавьте один или несколько хостов для управления
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Один хост</TabsTrigger>
            <TabsTrigger value="bulk">Массовое добавление</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ip">IP адрес *</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.1"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Порт</Label>
                <Input
                  id="port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Пользователь</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Название (опц.)</Label>
                <Input
                  id="name"
                  placeholder="Web Server 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Тип аутентификации</Label>
              <Select
                value={authType}
                onValueChange={(v) => setAuthType(v as AuthType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Пароль
                    </div>
                  </SelectItem>
                  <SelectItem value="key">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      SSH ключ
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {authType === 'password' ? (
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Формат ключа</Label>
                  <Select
                    value={keyFormat}
                    onValueChange={(v) => setKeyFormat(v as KeyFormat)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openssh">OpenSSH</SelectItem>
                      <SelectItem value="putty">PuTTY (PPK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key">Приватный ключ</Label>
                  <Textarea
                    id="key"
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="font-mono text-xs min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passphrase">Passphrase (опц.)</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Пароль к ключу"
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddSingle} disabled={!ip.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-2">
              <Label>Формат ввода</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Одна строка = один хост. Возможные форматы:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><code>IP</code> — только IP, пользователь root, ключ</li>
                  <li><code>IP user</code> — IP и пользователь</li>
                  <li><code>IP user password</code> — с паролем</li>
                  <li><code>IP:port user password</code> — с портом</li>
                </ul>
              </div>
            </div>

            <Textarea
              placeholder={`192.168.1.1
192.168.1.2 admin password123
192.168.1.3:2222 root secretpass`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="font-mono min-h-[200px]"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddBulk} disabled={!bulkText.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
