import { jsPDF } from 'jspdf';
import { generateFolderGedsTablePdf, type FolderGedRow } from './qualiphotoPdf';

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

/**
 * Generate PDF for Suivi "Avant only" – reuses folder table layout.
 */
export async function generateSuiviAvantPdf(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
): Promise<void> {
  await generateFolderGedsTablePdf(folderTitle, rows, filename);
}

/**
 * Generate PDF for Suivi "Après only" – reuses folder table layout.
 */
export async function generateSuiviApresPdf(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
): Promise<void> {
  await generateFolderGedsTablePdf(folderTitle, rows, filename);
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
 */
export async function generateSuiviBothPdf(
  folderTitle: string,
  pairedRows: SuiviPairRow[],
  filename?: string,
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
      let bottom = rowY + BOTH_PDF.cellPaddingMm;
      if (!cell) {
        doc.setFontSize(BOTH_PDF.descFontSize);
        doc.setTextColor(...GRAY);
        doc.text('—', x + BOTH_PDF.cellPaddingMm, bottom + 6);
        return bottom + 12;
      }

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
            bottom,
            fitW,
            fitH,
            undefined,
            'NONE',
          );
          bottom += fitH + BOTH_PDF.metaGapMm;
        } catch {
          doc.setFontSize(BOTH_PDF.descFontSize);
          doc.setTextColor(...GRAY);
          doc.text('—', x + BOTH_PDF.cellPaddingMm, bottom + 6);
          bottom += 12;
        }
      }

      doc.setFontSize(BOTH_PDF.metaFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      if (cell.publishedDate || cell.author) {
        const meta = [cell.publishedDate, cell.author].filter(Boolean).join(' · ');
        doc.text(meta, x + BOTH_PDF.cellPaddingMm, bottom + 4);
        bottom += 6;
      }

      doc.setFontSize(BOTH_PDF.titleFontSizeRow);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const titleText = (cell.title || '—').trim().slice(0, 60);
      const titleLines = doc.splitTextToSize(titleText, textW);
      doc.text(titleLines[0] ?? '—', x + imageColWidth + BOTH_PDF.cellPaddingMm, bottom + 4);
      bottom += 6;

      doc.setFontSize(BOTH_PDF.descFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      const descText = stripHtml(cell.description || '').trim().slice(0, 300);
      const descLines = doc.splitTextToSize(descText, textW);
      for (let i = 0; i < Math.min(descLines.length, 4); i++) {
        doc.text(descLines[i], x + imageColWidth + BOTH_PDF.cellPaddingMm, bottom + 4);
        bottom += BOTH_PDF.descFontSize * 0.35 * BOTH_PDF.descLineHeight;
      }
      return bottom + BOTH_PDF.cellPaddingMm;
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

  doc.save(filename || `suivi-both-${Date.now()}.pdf`);
}
