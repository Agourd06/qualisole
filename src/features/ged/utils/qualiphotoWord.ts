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
import { dataUrlToUint8Array } from './gedExportUtils';
import { htmlToSegments, DEFAULT_DESC_COLOR, hexToWordHighlight } from './htmlToSegments';

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build TextRun children for description with HTML color and highlight support. */
function descriptionToTextRuns(html: string, size = 18): TextRun[] {
  const segments = htmlToSegments(html);
  const hasFormatting = segments.some((s) => s.color || s.backgroundColor);
  if (!hasFormatting) {
    const plain = stripHtml(html).trim().slice(0, 2000) || '—';
    return [new TextRun({ text: plain, size, color: DEFAULT_DESC_COLOR })];
  }
  const highlightMap: Record<string, (typeof HighlightColor)[keyof typeof HighlightColor]> = {
    yellow: HighlightColor.YELLOW,
    red: HighlightColor.RED,
    green: HighlightColor.GREEN,
    blue: HighlightColor.BLUE,
    cyan: HighlightColor.CYAN,
    magenta: HighlightColor.MAGENTA,
    lightGray: HighlightColor.LIGHT_GRAY,
  };
  const runs = segments
    .map((seg) => {
      const text = seg.text.trim();
      if (!text) return null;
      const highlightVal = seg.backgroundColor ? hexToWordHighlight(seg.backgroundColor) : undefined;
      const highlight = highlightVal && highlightMap[highlightVal] ? highlightMap[highlightVal] : undefined;
      return new TextRun({
        text: text.slice(0, 2000),
        size,
        color: seg.color || DEFAULT_DESC_COLOR,
        highlight,
      });
    })
    .filter((r): r is TextRun => r !== null);
  return runs.length > 0 ? runs : [new TextRun({ text: '—', size, color: DEFAULT_DESC_COLOR })];
}

const IMAGE_WIDTH = 200;
const IMAGE_HEIGHT = 150;

export interface GenerateFolderWordOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

/**
 * Generate a Word document for the folder: title, introduction, table (image + meta | title + description), conclusion.
 */
export async function generateFolderGedsTableWord(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
  options?: GenerateFolderWordOptions,
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  const safeTitle = (folderTitle || 'Folder').trim() || 'Folder';

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: safeTitle, bold: true, size: 36 }),
      ],
      spacing: { after: 320 },
    }),
  );

  const introduction = options?.introduction?.trim() ?? '';
  if (introduction) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: stripHtml(introduction), size: 20, color: '404040' }),
        ],
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
            new Paragraph({ children: [new TextRun({ text: 'Image', bold: true })] }),
          ],
          shading: { fill: 'E8E8E8' },
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Title', bold: true })] }),
          ],
          shading: { fill: 'E8E8E8' },
        }),
      ],
    }),
  ];

  for (const row of rows) {
    const leftParagraphs: Paragraph[] = [];
    if (row.imageDataUrl) {
      try {
        const { data, type } = dataUrlToUint8Array(row.imageDataUrl);
        leftParagraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                type,
                data,
                transformation: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
              }),
            ],
            spacing: { after: 80 },
          }),
        );
      } catch {
        leftParagraphs.push(
          new Paragraph({ children: [new TextRun({ text: '—', italics: true })] }),
        );
      }
    }
    const metaLine = [row.publishedDate, row.author].filter(Boolean).join(' · ') || '—';
    leftParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: metaLine, size: 14, color: '6B7280' })],
      }),
    );

    const rightParagraphs: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: (row.title || '—').trim(), bold: true, size: 22 })],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: descriptionToTextRuns(row.description || ''),
      }),
    ];

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: leftParagraphs,
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E5E5' },
            },
          }),
          new TableCell({
            children: rightParagraphs,
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
        children: [
          new TextRun({ text: stripHtml(conclusion), size: 20, color: '6B7280' }),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `folder-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
