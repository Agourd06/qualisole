import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
} from 'docx';
import type { FolderGedRow } from './qualiphotoPdf';
import type { SuiviPairRow } from './suiviExportPdf';

export interface SuiviExportWordOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function dataUrlToArrayBuffer(dataUrl: string): { data: ArrayBuffer; type: 'png' | 'jpg' } {
  const [header, base64] = dataUrl.split(',');
  const type = header?.includes('png') ? 'png' : 'jpg';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { data: bytes.buffer, type };
}

const IMAGE_WIDTH = 180;
const IMAGE_HEIGHT = 135;

import { generateFolderGedsTableWord } from './qualiphotoWord';

/**
 * Generate Word for Suivi "Avant only" – reuses folder table.
 */
export async function generateSuiviAvantWord(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
  options?: SuiviExportWordOptions,
): Promise<void> {
  await generateFolderGedsTableWord(folderTitle, rows, filename, options);
}

/**
 * Generate Word for Suivi "Après only" – reuses folder table.
 */
export async function generateSuiviApresWord(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
  options?: SuiviExportWordOptions,
): Promise<void> {
  await generateFolderGedsTableWord(folderTitle, rows, filename, options);
}

/** Build one cell as table: image left | date+author, title, description right. */
function cellTableForRow(row: FolderGedRow | null): Table {
  const imageParagraphs: Paragraph[] = [];
  const textParagraphs: Paragraph[] = [];
  if (!row) {
    textParagraphs.push(new Paragraph({ children: [new TextRun({ text: '—', italics: true })] }));
  } else {
    if (row.imageDataUrl) {
      try {
        const { data, type } = dataUrlToArrayBuffer(row.imageDataUrl);
        imageParagraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                type,
                data,
                transformation: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
              }),
            ],
            spacing: { after: 60 },
          }),
        );
      } catch {
        imageParagraphs.push(new Paragraph({ children: [new TextRun({ text: '—', italics: true })] }));
      }
    }
    const metaParts = [row.publishedDate, row.author].filter(Boolean);
    const metaLine = metaParts.length ? metaParts.join('  ') : '—';
    textParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: metaLine, size: 14, color: '6B7280' })],
        spacing: { after: 40 },
      }),
    );
    textParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: (row.title || '—').trim(), bold: true, size: 20 })],
        spacing: { after: 60 },
      }),
    );
    textParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: stripHtml(row.description || '').slice(0, 800) || '—',
            size: 18,
            color: '374151',
          }),
        ],
      }),
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [40, 60],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: imageParagraphs.length ? imageParagraphs : [new Paragraph({ children: [new TextRun({ text: '—', italics: true })] })],
          }),
          new TableCell({
            children: textParagraphs,
          }),
        ],
      }),
    ],
  });
}

/**
 * Generate Word for Suivi "Both" (Avant | Après): table with two columns per row.
 * Layout per cell: image left | date + author, title, description right.
 */
export async function generateSuiviBothWord(
  folderTitle: string,
  pairedRows: SuiviPairRow[],
  filename?: string,
  options?: SuiviExportWordOptions,
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  const safeTitle = (folderTitle || 'Suivi Avant / Après').trim() || 'Suivi Avant / Après';
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: safeTitle, bold: true, size: 36 })],
      spacing: { after: 320 },
    }),
  );

  const introduction = options?.introduction?.trim() ?? '';
  if (introduction) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: stripHtml(introduction), size: 20, color: '404040' })],
        spacing: { after: 240 },
      }),
    );
  }

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Avant', bold: true })] }),
          ],
          shading: { fill: 'E8E8E8' },
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Après', bold: true })] }),
          ],
          shading: { fill: 'E8E8E8' },
        }),
      ],
    }),
  ];

  for (const pair of pairedRows) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [cellTableForRow(pair.avant)],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E5E5' },
            },
          }),
          new TableCell({
            children: [cellTableForRow(pair.apres)],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E5E5' },
            },
          }),
        ],
      }),
    );
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: '00529B' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E5E5' },
      },
    }),
  );

  const conclusion = options?.conclusion?.trim() ?? '';
  if (conclusion) {
    children.push(
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: stripHtml(conclusion), size: 20, color: '6B7280' })],
      }),
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `suivi-both-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
