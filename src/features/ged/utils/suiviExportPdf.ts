import { jsPDF } from 'jspdf';
import { generateFolderGedsTablePdf, type FolderGedRow } from './qualiphotoPdf';
import { htmlToSegments, hexToRgb, parseHtmlAlignment } from './htmlToSegments';

export type { FolderGedRow };

const BLUE = [0, 82, 155] as [number, number, number];
const BLACK = [38, 38, 38] as [number, number, number];
const GRAY = [107, 114, 128] as [number, number, number];

/** One row in the "both" export: Avant (left) and Après (right) cells. */
export interface SuiviPairRow {
  avant: FolderGedRow | null;
  apres: FolderGedRow | null;
}

function loadImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export interface SuiviExportPdfOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

/**
 * Generate PDF for Suivi "Avant only" – reuses folder table layout.
 */
export async function generateSuiviAvantPdf(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
  options?: SuiviExportPdfOptions,
): Promise<void> {
  await generateFolderGedsTablePdf(folderTitle, rows, filename, options);
}

/**
 * Generate PDF for Suivi "Après only" – reuses folder table layout.
 */
export async function generateSuiviApresPdf(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
  options?: SuiviExportPdfOptions,
): Promise<void> {
  await generateFolderGedsTablePdf(folderTitle, rows, filename, options);
}

const BOTH_PDF = {
  marginMm: 7,
  titleFontSize: 18,
  titleSpacingBelowMm: 14,
  headerFontSize: 10,
  cellPaddingMm: 3,
  imageMaxHeightMm: 40,
  metaFontSize: 7,
  metaGapMm: 1,
  titleFontSizeRow: 10,
  descFontSize: 9,
  descLineHeight: 1.4,
  rowGapMm: 4,
  separatorColor: [230, 230, 230] as [number, number, number],
};

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getPageSize(doc: jsPDF): { width: number; height: number } {
  const ps = doc.internal.pageSize;
  return {
    width: ps.getWidth ? ps.getWidth() : ps.width,
    height: ps.getHeight ? ps.getHeight() : ps.height,
  };
}

/**
 * Generate PDF for Suivi "Both" (Avant | Après): table with two columns per row.
 * Layout per cell: image left | date + author, title, description right.
 */
export async function generateSuiviBothPdf(
  folderTitle: string,
  pairedRows: SuiviPairRow[],
  filename?: string,
  options?: SuiviExportPdfOptions,
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = BOTH_PDF.marginMm;
  const { width: pageWidth, height: pageHeight } = getPageSize(doc);
  const contentWidth = pageWidth - 2 * margin;
  const colWidth = (contentWidth - BOTH_PDF.cellPaddingMm * 2) / 2;
  const imageColWidth = Math.min(colWidth * 0.55, 45);
  const textColWidth = colWidth - imageColWidth - BOTH_PDF.cellPaddingMm;
  const maxY = pageHeight - margin - 15;

  let y = margin;

  const safeTitle = (folderTitle || 'Suivi Avant / Après').trim() || 'Suivi Avant / Après';
  doc.setFontSize(BOTH_PDF.titleFontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  const titleW = doc.getTextWidth(safeTitle);
  doc.text(safeTitle, (pageWidth - titleW) / 2, y + 6);
  y += BOTH_PDF.titleSpacingBelowMm;

  const introduction = options?.introduction?.trim() ?? '';
  if (introduction) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const introLines = doc.splitTextToSize(stripHtml(introduction), contentWidth);
    for (let i = 0; i < introLines.length; i++) {
      doc.text(introLines[i], margin, y + 3.5);
      y += 4;
    }
    y += 6;
  }

  const drawPairRow = async (
    pair: SuiviPairRow,
    rowY: number,
  ): Promise<number> => {
    const drawCell = async (
      cell: FolderGedRow | null,
      x: number,
      _cellWidth: number,
      _imgW: number,
      textW: number,
    ): Promise<number> => {
      const textX = x + imageColWidth + BOTH_PDF.cellPaddingMm;
      let rightY = rowY + BOTH_PDF.cellPaddingMm;
      if (!cell) {
        doc.setFontSize(BOTH_PDF.descFontSize);
        doc.setTextColor(...GRAY);
        doc.text('—', x + BOTH_PDF.cellPaddingMm, rightY + 6);
        return rightY + 12;
      }

      let imageBottom = rowY + BOTH_PDF.cellPaddingMm;
      if (cell.imageDataUrl) {
        try {
          const { w: iw, h: ih } = await loadImageDimensions(cell.imageDataUrl);
          const aspect = ih / iw;
          let fitW = imageColWidth - BOTH_PDF.cellPaddingMm * 2;
          let fitH = fitW * aspect;
          if (fitH > BOTH_PDF.imageMaxHeightMm) {
            fitH = BOTH_PDF.imageMaxHeightMm;
            fitW = fitH / aspect;
          }
          const imgX = x + (imageColWidth - fitW) / 2;
          const fmt = cell.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(
            cell.imageDataUrl,
            fmt,
            imgX,
            rowY + BOTH_PDF.cellPaddingMm,
            fitW,
            fitH,
            undefined,
            'NONE',
          );
          imageBottom = rowY + BOTH_PDF.cellPaddingMm + fitH;
        } catch {
          doc.setFontSize(BOTH_PDF.descFontSize);
          doc.setTextColor(...GRAY);
          doc.text('—', x + BOTH_PDF.cellPaddingMm, rightY + 6);
          imageBottom = rightY + 12;
        }
      }

      doc.setFontSize(BOTH_PDF.metaFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      const metaParts = [cell.publishedDate, cell.author].filter(Boolean);
      const meta = metaParts.length ? metaParts.join('  ') : '—';
      doc.text(meta, textX, rightY + 4);
      rightY += 6;

      doc.setFontSize(BOTH_PDF.titleFontSizeRow);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const titleText = (cell.title || '—').trim().slice(0, 60);
      const titleLines = doc.splitTextToSize(titleText, textW);
      doc.text(titleLines[0] ?? '—', textX, rightY + 4);
      rightY += 6;

      doc.setFontSize(BOTH_PDF.descFontSize);
      doc.setFont('helvetica', 'normal');
      const descSegments = htmlToSegments(cell.description || '');
      const descHasFormatting = descSegments.some((s) => s.color || s.backgroundColor);
      const descAlign = parseHtmlAlignment(cell.description || '');
      const cellCenterX = textX + textW / 2;
      const cellRightX = textX + textW;
      const lineHeightDesc = BOTH_PDF.descFontSize * 0.35 * BOTH_PDF.descLineHeight;
      if (descHasFormatting && descSegments.length > 0) {
        for (const seg of descSegments) {
          const lines = doc.splitTextToSize(seg.text.slice(0, 300), textW);
          const segColor = seg.backgroundColor
            ? BLACK
            : seg.color
              ? hexToRgb(seg.color)
              : GRAY;
          const segBg = seg.backgroundColor ? hexToRgb(seg.backgroundColor) : null;
          for (const line of lines) {
            if (segBg) {
              doc.setFillColor(...segBg);
              const lineW = doc.getTextWidth(line);
              const rectH = lineHeightDesc - 0.2;
              const rectX =
                descAlign === 'center'
                  ? cellCenterX - lineW / 2
                  : descAlign === 'right'
                    ? cellRightX - lineW
                    : textX;
              doc.rect(rectX, rightY, lineW, rectH, 'F');
            }
            doc.setTextColor(...segColor);
            const textOpts =
              descAlign === 'center'
                ? ({ align: 'center' } as const)
                : descAlign === 'right'
                  ? ({ align: 'right' } as const)
                  : undefined;
            doc.text(
              line,
              descAlign === 'center' ? cellCenterX : descAlign === 'right' ? cellRightX : textX,
              rightY + 4,
              textOpts,
            );
            rightY += lineHeightDesc;
          }
        }
      } else {
        const descText = stripHtml(cell.description || '').trim().slice(0, 300);
        const descLines = doc.splitTextToSize(descText, textW);
        doc.setTextColor(...GRAY);
        for (let i = 0; i < Math.min(descLines.length, 4); i++) {
          const textOpts =
            descAlign === 'center'
              ? ({ align: 'center' } as const)
              : descAlign === 'right'
                ? ({ align: 'right' } as const)
                : undefined;
          doc.text(
            descLines[i],
            descAlign === 'center' ? cellCenterX : descAlign === 'right' ? cellRightX : textX,
            rightY + 4,
            textOpts,
          );
          rightY += BOTH_PDF.descFontSize * 0.35 * BOTH_PDF.descLineHeight;
        }
      }
      return Math.max(imageBottom, rightY) + BOTH_PDF.cellPaddingMm;
    };

    const xLeft = margin;
    const xRight = margin + colWidth + BOTH_PDF.cellPaddingMm * 2;

    const bottomLeft = await drawCell(
      pair.avant,
      xLeft,
      colWidth,
      imageColWidth,
      textColWidth,
    );
    const bottomRight = await drawCell(
      pair.apres,
      xRight,
      colWidth,
      imageColWidth,
      textColWidth,
    );
    return Math.max(bottomLeft, bottomRight);
  };

  if (pairedRows.length === 0) {
    doc.setFontSize(BOTH_PDF.descFontSize);
    doc.setTextColor(...GRAY);
    doc.text('No items.', margin, y + 8);
    y += 14;
  } else {
    for (let i = 0; i < pairedRows.length; i++) {
      if (y > maxY - 55) {
        doc.addPage();
        y = margin;
      }

      if (i === 0) {
        doc.setFontSize(BOTH_PDF.headerFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('Avant', margin + BOTH_PDF.cellPaddingMm, y + 4);
        doc.text('Après', margin + colWidth + BOTH_PDF.cellPaddingMm * 2 + BOTH_PDF.cellPaddingMm, y + 4);
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.35);
        doc.line(margin, y + 6, pageWidth - margin, y + 6);
        y += 10;
      }

      const rowY = y;
      y = await drawPairRow(pairedRows[i], rowY);
      y += BOTH_PDF.rowGapMm;

      doc.setDrawColor(...BOTH_PDF.separatorColor);
      doc.setLineWidth(0.15);
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;
    }
  }

  const conclusion = options?.conclusion?.trim() ?? '';
  if (conclusion) {
    y += 8;
    if (y > maxY - 25) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(...BOTH_PDF.separatorColor);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const conclLines = doc.splitTextToSize(stripHtml(conclusion), contentWidth);
    for (let i = 0; i < conclLines.length; i++) {
      doc.text(conclLines[i], margin, y + 3.5);
      y += 4;
    }
  }

  doc.save(filename || `suivi-both-${Date.now()}.pdf`);
}
