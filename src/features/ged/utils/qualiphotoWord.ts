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
  TableLayoutType,
  VerticalAlign,
} from 'docx';
import type { FolderGedRow } from './qualiphotoPdf';
import { dataUrlToUint8Array } from './gedExportUtils';
import { htmlToSegments, DEFAULT_DESC_COLOR, parseHtmlAlignment } from './htmlToSegments';
import { addTextOverlayToImage } from './imageOverlay';
import { POWERED_BY } from '../../../utils/constants';

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HIGHLIGHT_TEXT_COLOR = '000000'; // Black for readability when only highlight is applied

/** Build TextRun children and alignment for description with HTML color, highlight, bold, and list support. */
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
  const hasFormatting = segments.some((s) => s.color || s.backgroundColor || s.bold || s.listType);
  if (!hasFormatting) {
    const plain = stripHtml(html).trim().slice(0, 2000) || '—';
    return {
      runs: [new TextRun({ text: plain, size, color: DEFAULT_DESC_COLOR })],
      alignment: alignMap[alignKey] ?? AlignmentType.LEFT,
    };
  }
  
  const runs = segments
    .map((seg, idx) => {
      const prevSeg = idx > 0 ? segments[idx - 1] : null;
      
      // Check if this is the start of a new list item
      const isNewListItem = seg.listType && seg.listNumber != null && 
        (!prevSeg || !prevSeg.listType || prevSeg.listNumber !== seg.listNumber || prevSeg.listType !== seg.listType);
      
      // Handle list prefix only for first segment of a new list item
      let textToRender = seg.text.trim();
      if (isNewListItem) {
        if (seg.listType === 'ordered' && seg.listNumber != null) {
          textToRender = `${seg.listNumber}. ${textToRender}`;
        } else if (seg.listType === 'unordered' && seg.listNumber != null) {
          textToRender = `• ${textToRender}`;
        }
      }
      
      if (!textToRender) return null;
      // Use shading (fill) for background - keeps text color independent; highlight was overriding it
      const shading = seg.backgroundColor
        ? { fill: seg.backgroundColor, type: ShadingType.SOLID }
        : undefined;
      const textColor =
        seg.backgroundColor && !seg.color ? HIGHLIGHT_TEXT_COLOR : seg.color || DEFAULT_DESC_COLOR;
      return new TextRun({
        text: textToRender.slice(0, 2000),
        size,
        color: textColor,
        bold: seg.bold,
        shading,
      });
    })
    .filter((r): r is TextRun => r !== null);
  return {
    runs: runs.length > 0 ? runs : [new TextRun({ text: '—', size, color: DEFAULT_DESC_COLOR })],
    alignment: alignMap[alignKey] ?? AlignmentType.LEFT,
  };
}

const DOCX_LAYOUT = {
  imageMaxWidth: 600, // Increased for better image fit
  imageMaxHeight: 420, // Increased for better image fit
  imageColWidthPct: 50,
  textColWidthPct: 50,
  cellMarginTwip: 80, // Reduced to use more space
};

async function getDocxImageSize(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
      let width = maxWidth;
      let height = width * ratio;
      if (height > maxHeight) {
        height = maxHeight;
        width = height / Math.max(ratio, 0.001);
      }
      resolve({
        width: Math.max(100, Math.round(width)),
        height: Math.max(75, Math.round(height)),
      });
    };
    img.onerror = () => reject(new Error('Failed to load image dimensions'));
    img.src = dataUrl;
  });
}

export interface GenerateFolderWordOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

/**
 * Generate a Word document for the folder: title, introduction, table (image | title + description), conclusion.
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
            new Paragraph({ 
              children: [new TextRun({ text: 'Constat', bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: DOCX_LAYOUT.imageColWidthPct, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          margins: {
            top: DOCX_LAYOUT.cellMarginTwip,
            bottom: DOCX_LAYOUT.cellMarginTwip,
            left: DOCX_LAYOUT.cellMarginTwip,
            right: DOCX_LAYOUT.cellMarginTwip,
          },
          shading: { fill: 'E8E8E8' },
        }),
        new TableCell({
          children: [
            new Paragraph({ 
              children: [new TextRun({ text: 'Observations', bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: DOCX_LAYOUT.textColWidthPct, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          margins: {
            top: DOCX_LAYOUT.cellMarginTwip,
            bottom: DOCX_LAYOUT.cellMarginTwip,
            left: DOCX_LAYOUT.cellMarginTwip,
            right: DOCX_LAYOUT.cellMarginTwip,
          },
          shading: { fill: 'E8E8E8' },
        }),
      ],
    }),
  ];

  for (const row of rows) {
    const leftParagraphs: Paragraph[] = [];
    if (row.imageDataUrl) {
      try {
        const imageSize = await getDocxImageSize(
          row.imageDataUrl,
          DOCX_LAYOUT.imageMaxWidth,
          DOCX_LAYOUT.imageMaxHeight,
        );
        // Add text overlay (date, author) directly on the image - no labels, just values
        const imageWithOverlay = await addTextOverlayToImage(row.imageDataUrl, {
          date: row.publishedDate || undefined,
          author: row.author || undefined,
          poweredBy: POWERED_BY,
          position: 'bottom',
          outputWidth: imageSize.width,
          outputHeight: imageSize.height,
        });
        
        const { data, type } = dataUrlToUint8Array(imageWithOverlay);
        leftParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type,
                data,
                transformation: imageSize,
              }),
            ],
            spacing: { after: 80 },
          }),
        );
      } catch (error) {
        console.warn('Failed to add overlay to image:', error);
        // Fallback: use original image without overlay
        try {
          const { data, type } = dataUrlToUint8Array(row.imageDataUrl);
          const imageSize = await getDocxImageSize(
            row.imageDataUrl,
            DOCX_LAYOUT.imageMaxWidth,
            DOCX_LAYOUT.imageMaxHeight,
          );
          leftParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type,
                  data,
                  transformation: imageSize,
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
    } else if (row.isVideo) {
      // Create a video placeholder with border and background to simulate image space
      leftParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Video',
              bold: true,
              size: 24,
              color: '00529B', // Blue color matching PDF
            }),
          ],
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
          },
          shading: {
            fill: 'F5F5F5',
            type: ShadingType.SOLID,
          },
          spacing: {
            before: 380,
            after: 80,
          },
        }),
      );
    }
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
          width: { size: DOCX_LAYOUT.imageColWidthPct, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          margins: {
            top: DOCX_LAYOUT.cellMarginTwip,
            bottom: DOCX_LAYOUT.cellMarginTwip,
            left: DOCX_LAYOUT.cellMarginTwip,
            right: DOCX_LAYOUT.cellMarginTwip,
          },
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E5E5' },
            },
          }),
          new TableCell({
            children: rightParagraphs,
          width: { size: DOCX_LAYOUT.textColWidthPct, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          margins: {
            top: DOCX_LAYOUT.cellMarginTwip,
            bottom: DOCX_LAYOUT.cellMarginTwip,
            left: DOCX_LAYOUT.cellMarginTwip,
            right: DOCX_LAYOUT.cellMarginTwip,
          },
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
      layout: TableLayoutType.FIXED,
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
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch (reduced from default 1 inch = 1440)
              right: 720,  // 0.5 inch
              bottom: 720,  // 0.5 inch
              left: 720,   // 0.5 inch
              header: 720, // 0.5 inch
              footer: 720, // 0.5 inch
              gutter: 0,   // 0
            },
          },
        },
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
