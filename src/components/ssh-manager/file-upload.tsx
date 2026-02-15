'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useSSHStore } from '@/store/ssh-store';
import { ParseResult } from '@/types';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingHosts, setPendingHosts] = useState<ParseResult | null>(null);

  const { isLoading, error, parseResult, uploadFile, clearResult } = useFileUpload();
  const { addHosts } = useSSHStore();

  // Объявляем processFile первой
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

  // Показываем превью после парсинга
  const handleShowPreview = useCallback(() => {
    if (parseResult) {
      setPendingHosts(parseResult);
      setShowPreview(true);
    }
  }, [parseResult]);

  // Подтверждаем добавление хостов
  const handleConfirmAdd = useCallback(() => {
    if (pendingHosts) {
      addHosts(pendingHosts.hosts);
      setShowPreview(false);
      setPendingHosts(null);
      clearResult();
      onUploadComplete?.();
    }
  }, [pendingHosts, addHosts, clearResult, onUploadComplete]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls'].includes(ext || '')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    }
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Загрузка хостов
          </CardTitle>
          <CardDescription>
            Поддерживаемые форматы: TXT, CSV, XLSX, XLS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
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
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Обработка файла...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <p className="text-lg font-medium">
                  Перетащите файл сюда
                </p>
                <p className="text-sm text-muted-foreground">
                  или нажмите для выбора
                </p>
              </div>
            )}
          </div>

          {/* Результаты парсинга */}
          {parseResult && !showPreview && (
            <div className="mt-4 space-y-3">
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Файл обработан</AlertTitle>
                <AlertDescription>
                  Найдено IP-адресов: {parseResult.totalFound}, 
                  валидных: {parseResult.validCount}
                  {parseResult.errors.length > 0 && (
                    <span className="text-orange-500">, ошибок: {parseResult.errors.length}</span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={handleShowPreview} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить хосты ({parseResult.validCount})
                </Button>
                <Button variant="outline" onClick={clearResult}>
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="w-4 h-4" />
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Диалог превью */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Предпросмотр хостов</DialogTitle>
            <DialogDescription>
              Проверьте список хостов перед добавлением
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">IP</th>
                  <th className="text-left p-2">Порт</th>
                  <th className="text-left p-2">Пользователь</th>
                  <th className="text-left p-2">Аутент.</th>
                </tr>
              </thead>
              <tbody>
                {pendingHosts?.hosts.map((host, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-mono">{host.ip}</td>
                    <td className="p-2">{host.port}</td>
                    <td className="p-2">{host.username}</td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {host.authType === 'password' ? 'Пароль' : 'Ключ'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          {/* Ошибки парсинга */}
          {pendingHosts?.errors && pendingHosts.errors.length > 0 && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Ошибки при обработке</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-24">
                    <ul className="list-disc pl-4">
                      {pendingHosts.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Отмена
            </Button>
            <Button onClick={handleConfirmAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить {pendingHosts?.validCount || 0} хостов
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
