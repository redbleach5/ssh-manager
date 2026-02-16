// API Route для экспорта результатов

import { NextRequest, NextResponse } from 'next/server';
import { CommandResult, ExportFormat } from '@/types';
import * as xlsx from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results, format, includeTimestamp, includeErrors } = body as {
      results: CommandResult[];
      format: ExportFormat;
      includeTimestamp: boolean;
      includeErrors: boolean;
    };

    if (!results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет данных для экспорта' },
        { status: 400 }
      );
    }

    let content: string | Buffer;
    let filename: string;
    let mimeType: string;

    // Фильтруем результаты если нужно
    const filteredResults = includeErrors
      ? results
      : results.filter(r => r.success);

    switch (format) {
      case 'csv':
        content = generateCSV(filteredResults, includeTimestamp);
        filename = `ssh-results-${Date.now()}.csv`;
        mimeType = 'text/csv; charset=utf-8';
        break;

      case 'json':
        content = JSON.stringify(filteredResults, null, 2);
        filename = `ssh-results-${Date.now()}.json`;
        mimeType = 'application/json; charset=utf-8';
        break;

      case 'txt':
        content = generateTXT(filteredResults, includeTimestamp);
        filename = `ssh-results-${Date.now()}.txt`;
        mimeType = 'text/plain; charset=utf-8';
        break;

      case 'xlsx':
        content = generateXLSX(filteredResults, includeTimestamp);
        filename = `ssh-results-${Date.now()}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Неподдерживаемый формат' },
          { status: 400 }
        );
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка экспорта' },
      { status: 500 }
    );
  }
}

function generateCSV(results: CommandResult[], includeTimestamp: boolean): string {
  // Добавляем BOM для корректного отображения UTF-8 в Excel
  const BOM = '\uFEFF';

  const headers = [
    'IP адрес',
    'Команда',
    'Exit Code',
    'Статус',
    'Время выполнения (мс)',
    ...(includeTimestamp ? ['Время выполнения'] : []),
    'STDOUT',
    'STDERR',
  ];

  const rows = results.map(r => [
    r.hostIp,
    `"${r.command.replace(/"/g, '""')}"`,
    r.exitCode?.toString() || 'N/A',
    r.success ? 'Успех' : 'Ошибка',
    r.duration.toString(),
    ...(includeTimestamp ? [new Date(r.timestamp).toLocaleString('ru-RU')] : []),
    `"${r.stdout.replace(/"/g, '""').replace(/\n/g, '\\n')}"`,
    `"${r.stderr.replace(/"/g, '""').replace(/\n/g, '\\n')}"`,
  ]);

  return BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}

function generateTXT(results: CommandResult[], includeTimestamp: boolean): string {
  // Добавляем BOM для корректного отображения UTF-8
  const BOM = '\uFEFF';

  const content = results.map(r => {
    const lines = [
      `=== ${r.hostIp} ===`,
      `Команда: ${r.command}`,
      `Статус: ${r.success ? 'Успех' : 'Ошибка'} (Exit Code: ${r.exitCode ?? 'N/A'})`,
      `Время выполнения: ${r.duration}мс`,
      ...(includeTimestamp ? [`Дата: ${new Date(r.timestamp).toLocaleString('ru-RU')}`] : []),
      '',
      'STDOUT:',
      r.stdout || '(пусто)',
      '',
      'STDERR:',
      r.stderr || '(пусто)',
      '',
      '---',
      '',
    ];
    return lines.join('\n');
  }).join('\n');

  return BOM + content;
}

function generateXLSX(results: CommandResult[], includeTimestamp: boolean): Buffer {
  const data = results.map(r => ({
    'IP адрес': r.hostIp,
    'Команда': r.command,
    'Exit Code': r.exitCode ?? 'N/A',
    'Статус': r.success ? 'Успех' : 'Ошибка',
    'Время выполнения (мс)': r.duration,
    ...(includeTimestamp ? { 'Время выполнения': new Date(r.timestamp).toLocaleString('ru-RU') } : {}),
    'STDOUT': r.stdout,
    'STDERR': r.stderr,
  }));

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data);

  // Устанавливаем ширину колонок
  worksheet['!cols'] = [
    { wch: 15 }, // IP
    { wch: 30 }, // Команда
    { wch: 10 }, // Exit Code
    { wch: 10 }, // Статус
    { wch: 20 }, // Время
    ...(includeTimestamp ? [{ wch: 20 }] : []), // Дата
    { wch: 50 }, // STDOUT
    { wch: 30 }, // STDERR
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, 'Результаты');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
