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
  ShadingType,
} from 'docx';
import type { FolderGedRow } from './qualiphotoPdf';
import { POWERED_BY } from '../../../utils/constants';
import { dataUrlToUint8Array } from './gedExportUtils';
import { htmlToSegments, DEFAULT_DESC_COLOR, parseHtmlAlignment } from './htmlToSegments';

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HIGHLIGHT_TEXT_COLOR = '000000'; // Black for readability when only highlight is applied

/** Build TextRun children and alignment for description with HTML color and highlight support. */
function descriptionToContent(html: string, size = 18): {
  runs: TextRun[];
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
} {
  const segments = htmlToSegments(html);
  const alignKey = parseHtmlAlignment(html);
  const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
  };
  const hasFormatting = segments.some((s) => s.color || s.backgroundColor);
  if (!hasFormatting) {
    const plain = stripHtml(html).trim().slice(0, 2000) || '—';
    return {
      runs: [new TextRun({ text: plain, size, color: DEFAULT_DESC_COLOR })],
      alignment: alignMap[alignKey] ?? AlignmentType.LEFT,
    };
  }
  const runs = segments
    .map((seg) => {
      const text = seg.text.trim();
      if (!text) return null;
      // Use shading (fill) for background - keeps text color independent; highlight was overriding it
      const shading = seg.backgroundColor
        ? { fill: seg.backgroundColor, type: ShadingType.SOLID }
        : undefined;
      const textColor =
        seg.backgroundColor && !seg.color ? HIGHLIGHT_TEXT_COLOR : seg.color || DEFAULT_DESC_COLOR;
      return new TextRun({
        text: text.slice(0, 2000),
        size,
        color: textColor,
        shading,
      });
    })
    .filter((r): r is TextRun => r !== null);
  return {
    runs: runs.length > 0 ? runs : [new TextRun({ text: '—', size, color: DEFAULT_DESC_COLOR })],
    alignment: alignMap[alignKey] ?? AlignmentType.LEFT,
  };
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
      leftParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Powered by ${POWERED_BY}`, size: 10, color: '6B7280' })],
          spacing: { after: 40 },
        }),
      );
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
      (() => {
        const { runs, alignment } = descriptionToContent(row.description || '');
        return new Paragraph({ children: runs, alignment });
      })(),
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
