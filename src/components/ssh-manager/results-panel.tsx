'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useSSHStore } from '@/store/ssh-store';
import { CommandResult, ExportFormat } from '@/types';

export function ResultsPanel() {
  const [selectedResult, setSelectedResult] = useState<CommandResult | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeErrors, setIncludeErrors] = useState(true);

  const { results, clearResults } = useSSHStore();

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          format: exportFormat,
          includeTimestamp,
          includeErrors,
        }),
      });

      if (!response.ok) throw new Error('Ошибка экспорта');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssh-results-${Date.now()}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const successResults = results.filter((r) => r.success);
  const errorResults = results.filter((r) => !r.success);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Результаты
            </CardTitle>
            <CardDescription>
              Всего: {results.length} |
              <span className="text-green-500 ml-1">Успех: {successResults.length}</span> |
              <span className="text-red-500 ml-1">Ошибок: {errorResults.length}</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showExport} onOpenChange={setShowExport}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={results.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Экспорт результатов</DialogTitle>
                  <DialogDescription>
                    Выберите формат и параметры экспорта
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Формат файла</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'csv', icon: FileText, label: 'CSV' },
                        { value: 'json', icon: FileJson, label: 'JSON' },
                        { value: 'txt', icon: FileText, label: 'TXT' },
                        { value: 'xlsx', icon: FileSpreadsheet, label: 'XLSX' },
                      ].map((format) => (
                        <Button
                          key={format.value}
                          variant={exportFormat === format.value ? 'default' : 'outline'}
                          onClick={() => setExportFormat(format.value as ExportFormat)}
                          className="flex-col h-auto py-2"
                        >
                          <format.icon className="w-5 h-5 mb-1" />
                          <span className="text-xs">{format.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="timestamp"
                      checked={includeTimestamp}
                      onCheckedChange={(checked) => setIncludeTimestamp(!!checked)}
                    />
                    <label htmlFor="timestamp" className="text-sm">
                      Включить время выполнения
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="errors"
                      checked={includeErrors}
                      onCheckedChange={(checked) => setIncludeErrors(!!checked)}
                    />
                    <label htmlFor="errors" className="text-sm">
                      Включить результаты с ошибками
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowExport(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearResults}
              disabled={results.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="all" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              Все ({results.length})
            </TabsTrigger>
            <TabsTrigger value="success">
              <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
              Успех ({successResults.length})
            </TabsTrigger>
            <TabsTrigger value="error">
              <XCircle className="w-3 h-3 mr-1 text-red-500" />
              Ошибки ({errorResults.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            <ResultsList results={results} onSelect={setSelectedResult} />
          </TabsContent>
          <TabsContent value="success" className="m-0">
            <ResultsList results={successResults} onSelect={setSelectedResult} />
          </TabsContent>
          <TabsContent value="error" className="m-0">
            <ResultsList results={errorResults} onSelect={setSelectedResult} />
          </TabsContent>
        </Tabs>

        {/* Диалог просмотра результата */}
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedResult?.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Результат: {selectedResult?.hostIp}
              </DialogTitle>
              <DialogDescription>
                Команда: <code className="bg-muted px-1 rounded">{selectedResult?.command}</code>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Exit Code:</span>{' '}
                  <Badge variant={selectedResult?.exitCode === 0 ? 'default' : 'destructive'}>
                    {selectedResult?.exitCode ?? 'N/A'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Время:</span>{' '}
                  {selectedResult?.duration} мс
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>{' '}
                  {selectedResult?.success ? (
                    <Badge className="bg-green-500">Успех</Badge>
                  ) : (
                    <Badge variant="destructive">Ошибка</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">STDOUT</label>
                <ScrollArea className="h-[150px]">
                  <pre className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
                    {selectedResult?.stdout || '(пусто)'}
                  </pre>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">STDERR</label>
                <ScrollArea className="h-[100px]">
                  <pre className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap text-red-400">
                    {selectedResult?.stderr || '(пусто)'}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ResultsList({
  results,
  onSelect,
}: {
  results: CommandResult[];
  onSelect: (result: CommandResult) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет результатов для отображения
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={`${result.hostId}-${index}`}
            className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer flex items-center justify-between"
            onClick={() => onSelect(result)}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{result.hostIp}</span>
                  <Badge variant="outline" className="text-xs">
                    {result.duration} мс
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground">{result.command}</code>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
