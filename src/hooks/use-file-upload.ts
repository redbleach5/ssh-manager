// Хук для загрузки и парсинга файлов с хостами

import { useState, useCallback } from 'react';
import { ParseResult } from '@/types';

interface UseFileUploadResult {
  isLoading: boolean;
  error: string | null;
  parseResult: ParseResult | null;
  uploadFile: (file: File) => Promise<void>;
  clearResult: () => void;
}

export function useFileUpload(): UseFileUploadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParseResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/hosts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Ошибка обработки файла');
      }

      // Парсер возвращает только IP и порты, креды будут применены на клиенте
      setParseResult({
        hosts: result.data.hosts.map((h: { ip: string; port: number; username?: string; password?: string; name?: string }) => ({
          ip: h.ip,
          port: h.port,
          // Не используем username/password из файла - будут применены общие креды
          username: '', // Будет заменён на общий
          password: undefined, // Будет заменён на общий
          authType: 'password',
          name: h.name,
        })),
        errors: result.data.parseResult.errors,
        totalFound: result.data.parseResult.totalFound,
        validCount: result.data.parseResult.validCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setParseResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    parseResult,
    uploadFile,
    clearResult,
  };
}
