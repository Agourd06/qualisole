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
  HighlightColor,
} from 'docx';
import type { FolderGedRow } from './qualiphotoPdf';
import type { SuiviPairRow } from './suiviExportPdf';
import { dataUrlToUint8Array } from './gedExportUtils';
import { htmlToSegments, DEFAULT_DESC_COLOR, hexToWordHighlight } from './htmlToSegments';

export interface SuiviExportWordOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
        const { data, type } = dataUrlToUint8Array(row.imageDataUrl);
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
    const descSegments = htmlToSegments(row.description || '');
    const descHasFormatting = descSegments.some((s) => s.color || s.backgroundColor);
    const highlightMap: Record<string, (typeof HighlightColor)[keyof typeof HighlightColor]> = {
      yellow: HighlightColor.YELLOW,
      red: HighlightColor.RED,
      green: HighlightColor.GREEN,
      blue: HighlightColor.BLUE,
      cyan: HighlightColor.CYAN,
      magenta: HighlightColor.MAGENTA,
      lightGray: HighlightColor.LIGHT_GRAY,
    };
    const descRuns =
      descHasFormatting && descSegments.length > 0
        ? descSegments
            .map((seg) => {
              const t = seg.text.trim();
              if (!t) return null;
              const h = seg.backgroundColor ? hexToWordHighlight(seg.backgroundColor) : undefined;
              const highlight = h && highlightMap[h] ? highlightMap[h] : undefined;
              return new TextRun({
                text: t.slice(0, 800),
                size: 18,
                color: seg.color || DEFAULT_DESC_COLOR,
                highlight,
              });
            })
            .filter((r): r is TextRun => r !== null)
        : [new TextRun({ text: (stripHtml(row.description || '').slice(0, 800) || '—'), size: 18, color: DEFAULT_DESC_COLOR })];
    textParagraphs.push(
      new Paragraph({
        children: descRuns.length > 0 ? descRuns : [new TextRun({ text: '—', size: 18, color: DEFAULT_DESC_COLOR })],
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
