import { jsPDF } from 'jspdf';
import { generateFolderGedsTablePdf, type FolderGedRow } from './qualiphotoPdf';
import { POWERED_BY } from '../../../utils/constants';
import { renderHtmlToPdf } from './htmlToPdf';

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
  marginMm: 8,
  titleFontSize: 18,
  titleSpacingBelowMm: 14,
  headerFontSize: 10,
  cellPaddingMm: 3,
  imageMaxHeightMm: 74,
  metaFontSize: 7,
  metaGapMm: 1,
  titleFontSizeRow: 10.5,
  descFontSize: 9,
  descLineHeight: 1.5,
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
  const imageColWidth = Math.min(colWidth * 0.50, 68);
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

  /**
   * Estimate the height of a row before rendering to make better pagination decisions.
   * This ensures Avant and Après stay together on the same page.
   */
  const estimateRowHeight = (pair: SuiviPairRow): number => {
    let maxHeight = 0;
    
    // Estimate height for each cell
    [pair.avant, pair.apres].forEach((cell) => {
      if (!cell) {
        maxHeight = Math.max(maxHeight, 15); // Empty cell
        return;
      }
      
      let cellHeight = BOTH_PDF.cellPaddingMm * 2;
      
      // Image or video height
      if (cell.imageDataUrl) {
        cellHeight += Math.min(BOTH_PDF.imageMaxHeightMm, 74);
      } else if (cell.isVideo) {
        cellHeight += 12; // Video text height
      }
      
      // Meta line
      if (cell.publishedDate || cell.author) {
        cellHeight += 6;
      }
      
      // Title (usually 1-2 lines)
      const titleText = (cell.title || '').trim().slice(0, 60);
      const titleLines = doc.splitTextToSize(titleText, textColWidth).length;
      cellHeight += Math.min(titleLines, 2) * 6;
      
      // Description - estimate based on text length
      // Be more conservative to avoid over-estimation that causes premature page breaks
      const descText = stripHtml(cell.description || '').trim().slice(0, 300);
      if (descText) {
        // Rough estimate: ~60 chars per line (wider estimate), each line ~3.5mm
        // Cap at reasonable height to avoid over-estimation
        const estimatedLines = Math.ceil(descText.length / 60);
        cellHeight += Math.min(estimatedLines, 6) * 3.5; // More conservative estimate
      }
      
      maxHeight = Math.max(maxHeight, cellHeight);
    });
    
    return maxHeight + BOTH_PDF.rowGapMm + 3; // Add separator line space
  };

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
          const imgY = rowY + BOTH_PDF.cellPaddingMm;
          const fmt = cell.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(
            cell.imageDataUrl,
            fmt,
            imgX,
            imgY,
            fitW,
            fitH,
            undefined,
            'NONE',
          );
          
          // Add "Powered by" watermark at top center
          const watermarkText = POWERED_BY;
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.setFillColor(50, 50, 50);
          const ww = doc.getTextWidth(watermarkText) + 2;
          doc.rect(imgX + (fitW - ww) / 2, imgY + 0.5, ww, 2.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text(watermarkText, imgX + fitW / 2, imgY + 2.2, { align: 'center' });
          
          // Set imageBottom after image
          imageBottom = rowY + BOTH_PDF.cellPaddingMm + fitH;
          
          // Add author and date separately BELOW the image (not overlaid)
          if (cell.author || cell.publishedDate) {
            let metaY = imageBottom + 2;
            doc.setFontSize(4);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...BLACK);
            
            // Author on left, date on right (separate text, not overlay)
            if (cell.author) {
              doc.setFont('helvetica', 'bold');
              doc.text(cell.author, imgX, metaY);
            }
            if (cell.publishedDate) {
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(cell.publishedDate);
              doc.text(cell.publishedDate, imgX + fitW - dateWidth, metaY);
            }
            
            imageBottom = metaY + 3;
          }
        } catch {
          doc.setFontSize(BOTH_PDF.descFontSize);
          doc.setTextColor(...GRAY);
          doc.text('—', x + BOTH_PDF.cellPaddingMm, rightY + 6);
          imageBottom = rightY + 12;
        }
      } else if (cell.isVideo) {
        // Show "Video" text for videos
        doc.setFontSize(BOTH_PDF.descFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        const videoText = 'Video';
        const videoTextW = doc.getTextWidth(videoText);
        doc.text(videoText, x + (imageColWidth - videoTextW) / 2, rightY + 6);
        imageBottom = rightY + 12;
      } else {
        // No image and not a video - ensure imageBottom is set so text can render properly
        imageBottom = rightY;
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
      // Use HTML rendering for descriptions - preserves all formatting perfectly
      // Use maxY from page level to prevent page breaks within cells (keeps Avant/Après together)
      const cellDescription = (cell.description || '').trim().slice(0, 300);
      if (cellDescription) {
        const descY = await renderHtmlToPdf(
          doc,
          cellDescription,
          textX,
          rightY,
          textW,
          maxY, // Use page-level maxY to prevent internal page breaks
          {
            fontSize: BOTH_PDF.descFontSize,
            lineHeight: BOTH_PDF.descLineHeight,
            color: '#6B7280', // GRAY
          }
        );
        rightY = descY;
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
      // Estimate row height before rendering to make smarter pagination decisions
      const estimatedHeight = estimateRowHeight(pairedRows[i]);
      
      // Only add new page if we don't have enough space for the estimated row height
      // Use a more conservative buffer to ensure Avant and Après stay together
      // Only break if we really don't have space (use 30mm buffer for safety)
      if (y + estimatedHeight > maxY - 30) {
        doc.addPage();
        y = margin;
        
        // Redraw styled header on new page
        const headerH = 7;
        const leftHeaderX = margin;
        const rightHeaderX = margin + colWidth + BOTH_PDF.cellPaddingMm * 2;
        doc.setFillColor(232, 232, 232);
        doc.rect(leftHeaderX, y, colWidth, headerH, 'F');
        doc.rect(rightHeaderX, y, colWidth, headerH, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.2);
        doc.rect(leftHeaderX, y, colWidth, headerH);
        doc.rect(rightHeaderX, y, colWidth, headerH);
        doc.setFontSize(BOTH_PDF.headerFontSize + 0.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('Avant', leftHeaderX + BOTH_PDF.cellPaddingMm, y + 4.6);
        doc.text('Après', rightHeaderX + BOTH_PDF.cellPaddingMm, y + 4.6);
        y += headerH + 3;
      }

      if (i === 0) {
        const headerH = 7;
        const leftHeaderX = margin;
        const rightHeaderX = margin + colWidth + BOTH_PDF.cellPaddingMm * 2;
        doc.setFillColor(232, 232, 232);
        doc.rect(leftHeaderX, y, colWidth, headerH, 'F');
        doc.rect(rightHeaderX, y, colWidth, headerH, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.2);
        doc.rect(leftHeaderX, y, colWidth, headerH);
        doc.rect(rightHeaderX, y, colWidth, headerH);
        doc.setFontSize(BOTH_PDF.headerFontSize + 0.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('Avant', leftHeaderX + BOTH_PDF.cellPaddingMm, y + 4.6);
        doc.text('Après', rightHeaderX + BOTH_PDF.cellPaddingMm, y + 4.6);
        y += headerH + 3;
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
