// API Route для парсинга файлов с хостами

import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/parsers/file-parsers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // Парсим файл - получаем только IP и порты
    const parseResult = await parseFile(file, content, ''); // пустой username

    // Возвращаем только IP, порты и имена - креды применяются на клиенте
    const hosts = parseResult.hosts.map(h => ({
      ip: h.ip,
      port: h.port,
      name: h.name,
    }));

    return NextResponse.json({
      success: true,
      data: {
        hosts,
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
