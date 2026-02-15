// API Route для парсинга файлов с хостами

import { NextRequest, NextResponse } from 'next/server';
import { parseFile, createHostsFromParseResult } from '@/lib/parsers/file-parsers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const defaultUsername = formData.get('defaultUsername') as string || 'root';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Файл не загружен' },
        { status: 400 }
      );
    }

    // Читаем содержимое файла
    const extension = file.name.split('.').pop()?.toLowerCase();
    let content: string | Buffer;

    if (extension === 'xlsx' || extension === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      content = Buffer.from(arrayBuffer);
    } else {
      content = await file.text();
    }

    // Парсим файл
    const parseResult = await parseFile(file, content, defaultUsername);

    // Создаем хосты с ID
    const hosts = createHostsFromParseResult(parseResult);

    return NextResponse.json({
      success: true,
      data: {
        hosts: hosts.slice(-parseResult.validCount), // Только новые хосты
        parseResult: {
          totalFound: parseResult.totalFound,
          validCount: parseResult.validCount,
          errors: parseResult.errors,
        },
      },
    });
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка обработки файла' },
      { status: 500 }
    );
  }
}

// Валидация IP адресов
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ips } = body as { ips: string[] };

    if (!ips || !Array.isArray(ips)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат данных' },
        { status: 400 }
      );
    }

    const { isValidIP } = await import('@/lib/parsers/file-parsers');
    const results = ips.map(ip => ({
      ip,
      valid: isValidIP(ip),
    }));

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка валидации' },
      { status: 500 }
    );
  }
}
