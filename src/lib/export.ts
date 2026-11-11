'use client';

import { strToU8, zipSync } from 'fflate';

export type ExportRow = Record<string, string | number | null | undefined>;

function timestampedFilename(base: string, ext: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-${stamp}.${ext}`;
}

function headersFor(rows: ExportRow[]) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

function safeCsvValue(value: ExportRow[string]) {
  const text = String(value ?? '');
  // Prevent spreadsheet software from treating user supplied strings as formulas.
  const safe = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportToCsv(filenameBase: string, rows: ExportRow[]) {
  if (rows.length === 0) return;

  const headers = headersFor(rows);
  const csvRows = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header])),
  ];
  const csv = `\uFEFF${csvRows.map((row) => row.map(safeCsvValue).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, timestampedFilename(filenameBase, 'csv'));
}

function xmlEscape(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index: number) {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function worksheetXml(rows: ExportRow[], headers: string[]) {
  const data = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
  const sheetRows = data.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${reference}"><v>${value}</v></c>`;
      }

      // Inline strings are written as text cells, so names starting with "=" or
      // similar characters are never interpreted as spreadsheet formulas.
      const text = xmlEscape(String(value ?? ''));
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
    });
    return `<row r="${rowIndex + 1}">${cells.join('')}</row>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows.join('')}</sheetData></worksheet>`;
}

function workbookFiles(rows: ExportRow[], sheetName: string) {
  const name = sheetName.replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31) || 'Data';
  const headers = headersFor(rows);
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${xmlEscape(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>'
    ),
    'xl/worksheets/sheet1.xml': strToU8(worksheetXml(rows, headers)),
  };
  return files;
}

export function exportToExcel(filenameBase: string, rows: ExportRow[], sheetName = 'Data') {
  if (rows.length === 0) return;
  const bytes = zipSync(workbookFiles(rows, sheetName), { level: 6 });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, timestampedFilename(filenameBase, 'xlsx'));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
