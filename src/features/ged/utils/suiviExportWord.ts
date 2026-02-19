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
import type { SuiviPairRow } from './suiviExportPdf';
import { dataUrlToUint8Array } from './gedExportUtils';
import { htmlToSegments, DEFAULT_DESC_COLOR, parseHtmlAlignment } from './htmlToSegments';
import { addTextOverlayToImage } from './imageOverlay';
import { generateFolderGedsTableWord } from './qualiphotoWord';
import { POWERED_BY } from '../../../utils/constants';

export interface SuiviExportWordOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const DOCX_LAYOUT = {
  imageMaxWidth: 600, // Increased for better image fit
  imageMaxHeight: 420, // Increased for better image fit
  nestedImageColWidthPct: 50,
  nestedTextColWidthPct: 50,
  outerColWidthPct: 50,
  cellMarginTwip: 50, // Further reduced to maximize table space
  nestedCellMarginTwip: 30, // Smaller margin for nested cells since they're inside outer cells
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
async function cellTableForRow(row: FolderGedRow | null): Promise<Table> {
  const imageParagraphs: Paragraph[] = [];
  const textParagraphs: Paragraph[] = [];
  if (!row) {
    textParagraphs.push(new Paragraph({ children: [new TextRun({ text: '—', italics: true })] }));
  } else {
    if (row.imageDataUrl) {
      try {
        const imageSize = await getDocxImageSize(
          row.imageDataUrl,
          DOCX_LAYOUT.imageMaxWidth,
          DOCX_LAYOUT.imageMaxHeight,
        );
        // Add only "Powered by" overlay on the image, not author/date
        const imageWithOverlay = await addTextOverlayToImage(row.imageDataUrl, {
          poweredBy: POWERED_BY,
          position: 'top',
          outputWidth: imageSize.width,
          outputHeight: imageSize.height,
        });
        
        const { data, type } = dataUrlToUint8Array(imageWithOverlay);
        imageParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type,
                data,
                transformation: imageSize,
              }),
              ],
              spacing: { after: 20 },
            }),
          );
          
          // Add author and date separately BELOW the image (not overlaid)
          if (row.author || row.publishedDate) {
            const metaRuns: TextRun[] = [];
            if (row.author) {
              metaRuns.push(new TextRun({ text: row.author, bold: true, size: 16 }));
            }
            if (row.publishedDate) {
              if (metaRuns.length > 0) {
                metaRuns.push(new TextRun({ text: ' • ', size: 16 }));
              }
              metaRuns.push(new TextRun({ text: row.publishedDate, size: 16 }));
            }
            if (metaRuns.length > 0) {
              imageParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: metaRuns,
                  spacing: { after: 20 },
                }),
              );
            }
          }
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
          imageParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type,
                  data,
                  transformation: imageSize,
                }),
              ],
              spacing: { after: 20 },
            }),
          );
          
          // Add author and date separately BELOW the image (fallback)
          if (row.author || row.publishedDate) {
            const metaRuns: TextRun[] = [];
            if (row.author) {
              metaRuns.push(new TextRun({ text: row.author, bold: true, size: 16 }));
            }
            if (row.publishedDate) {
              if (metaRuns.length > 0) {
                metaRuns.push(new TextRun({ text: ' • ', size: 16 }));
              }
              metaRuns.push(new TextRun({ text: row.publishedDate, size: 16 }));
            }
            if (metaRuns.length > 0) {
              imageParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: metaRuns,
                  spacing: { after: 20 },
                }),
              );
            }
          }
        } catch {
          imageParagraphs.push(new Paragraph({ children: [new TextRun({ text: '—', italics: true })] }));
        }
      }
    } else if (row.isVideo) {
      // Create a video placeholder with border and background to simulate image space
      imageParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Video',
              bold: true,
              size: 22,
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
            before: 120,
            after: 20,
          },
        }),
      );
    }
    textParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: (row.title || '—').trim(), bold: true, size: 20 })],
        spacing: { after: 30 },
      }),
    );
    const descSegments = htmlToSegments(row.description || '');
    const descHasFormatting = descSegments.some((s) => s.color || s.backgroundColor || s.bold || s.listType);
    const alignKey = parseHtmlAlignment(row.description || '');
    const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
    };
    const HIGHLIGHT_TEXT_COLOR = '000000';
    
    const descRuns =
      descHasFormatting && descSegments.length > 0
        ? descSegments
            .map((seg, idx) => {
              const prevSeg = idx > 0 ? descSegments[idx - 1] : null;
              
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
              const shading = seg.backgroundColor
                ? { fill: seg.backgroundColor, type: ShadingType.SOLID }
                : undefined;
              const textColor =
                seg.backgroundColor && !seg.color ? HIGHLIGHT_TEXT_COLOR : seg.color || DEFAULT_DESC_COLOR;
              return new TextRun({
                text: textToRender.slice(0, 800),
                size: 18,
                color: textColor,
                bold: seg.bold,
                shading,
              });
            })
            .filter((r): r is TextRun => r !== null)
        : [new TextRun({ text: (stripHtml(row.description || '').slice(0, 800) || '—'), size: 18, color: DEFAULT_DESC_COLOR })];
    textParagraphs.push(
      new Paragraph({
        children: descRuns.length > 0 ? descRuns : [new TextRun({ text: '—', size: 18, color: DEFAULT_DESC_COLOR })],
        alignment: alignMap[alignKey] ?? AlignmentType.LEFT,
      }),
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: imageParagraphs.length ? imageParagraphs : [new Paragraph({ children: [new TextRun({ text: '—', italics: true })] })],
            width: { size: DOCX_LAYOUT.nestedImageColWidthPct, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            margins: {
              top: DOCX_LAYOUT.nestedCellMarginTwip,
              bottom: DOCX_LAYOUT.nestedCellMarginTwip,
              left: DOCX_LAYOUT.nestedCellMarginTwip,
              right: DOCX_LAYOUT.nestedCellMarginTwip,
            },
          }),
          new TableCell({
            children: textParagraphs,
            width: { size: DOCX_LAYOUT.nestedTextColWidthPct, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            margins: {
              top: DOCX_LAYOUT.nestedCellMarginTwip,
              bottom: DOCX_LAYOUT.nestedCellMarginTwip,
              left: DOCX_LAYOUT.nestedCellMarginTwip,
              right: DOCX_LAYOUT.nestedCellMarginTwip,
            },
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
      spacing: { after: 200 },
    }),
  );

  const introduction = options?.introduction?.trim() ?? '';
  if (introduction) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: stripHtml(introduction), size: 20, color: '404040' })],
        spacing: { after: 160 },
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
              children: [new TextRun({ text: 'Avant', bold: true, color: '00529B', size: 24 })],
            }),
          ],
          width: { size: DOCX_LAYOUT.outerColWidthPct, type: WidthType.PERCENTAGE },
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
              children: [new TextRun({ text: 'Après', bold: true, color: '00529B', size: 24 })],
            }),
          ],
          width: { size: DOCX_LAYOUT.outerColWidthPct, type: WidthType.PERCENTAGE },
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

  for (const pair of pairedRows) {
    const avantTable = await cellTableForRow(pair.avant);
    const apresTable = await cellTableForRow(pair.apres);
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [avantTable],
            width: { size: DOCX_LAYOUT.outerColWidthPct, type: WidthType.PERCENTAGE },
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
            children: [apresTable],
            width: { size: DOCX_LAYOUT.outerColWidthPct, type: WidthType.PERCENTAGE },
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
      new Paragraph({ spacing: { before: 240 } }),
      new Paragraph({
        children: [new TextRun({ text: stripHtml(conclusion), size: 20, color: '6B7280' })],
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
  a.download = filename || `suivi-both-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
