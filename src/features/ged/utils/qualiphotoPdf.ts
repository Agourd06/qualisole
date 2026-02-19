import { jsPDF } from 'jspdf';
import { renderHtmlToPdf } from './htmlToPdf';
import { POWERED_BY } from '../../../utils/constants';

/** Blue accent (report style, like IMAGE DATA REPORT). Customize via theme. */
const BLUE = [0, 82, 155] as [number, number, number];
const BLACK = [38, 38, 38] as [number, number, number];
const GRAY = [107, 114, 128] as [number, number, number];

const PDF_CONFIG = {
  page: {
    format: 'a4' as const,
    marginMm: 8,
    marginTopMm: 14,
  },
  header: {
    titleFontSize: 18,
    reportDateFontSize: 10,
    separatorHeightMm: 0.8,
    marginBottomMm: 14,
  },
  /** Centered image block */
  imageCol: {
    maxWidthMm: 210,
    maxHeightMm: 165,
  },
  /** Right column: data list */
  dataCol: {
    gapMm: 4,
    labelFontSize: 10,
    valueFontSize: 10,
  },
  sectionHeading: {
    fontSize: 11,
    marginBottomMm: 6,
  },
  description: {
    headingMarginTopMm: 12,
    fontSize: 10,
    lineHeight: 1.55,
    color: GRAY,
  },
};

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface QualiphotoPdfData {
  title: string;
  author: string | null;
  publishedDate: string;
  description: string;
  /** Data URL or null to skip image. */
  imageDataUrl: string | null;
  /** True if this is a video (imageDataUrl will be null for videos). */
  isVideo?: boolean;
}

function loadImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getPageSize(doc: jsPDF): { width: number; height: number } {
  const ps = doc.internal.pageSize;
  return {
    width: ps.getWidth ? ps.getWidth() : ps.width,
    height: ps.getHeight ? ps.getHeight() : ps.height,
  };
}

/** Format date for PDF (e.g. "02 February 2026" for report date). */
function formatPdfDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Generate a premium PDF: IMAGE DATA REPORT style.
 * Layout: Header (title + report date) → Row [Image left | Data right] → Description below.
 */
export async function generateQualiphotoPdf(
  data: QualiphotoPdfData,
  filename?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: PDF_CONFIG.page.format,
  });

  const { width: pageWidth, height: pageHeight } = getPageSize(doc);
  const margin = PDF_CONFIG.page.marginMm;
  const marginTop = PDF_CONFIG.page.marginTopMm;
  const contentWidth = pageWidth - 2 * margin;
  const maxY = pageHeight - margin - 15;
  let y = marginTop;

  // —— Header: Centered title only ——
  const reportTitle = (data.title.trim() || 'IMAGE DATA REPORT').toUpperCase();
  doc.setFontSize(PDF_CONFIG.header.titleFontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  const titleW = doc.getTextWidth(reportTitle);
  doc.text(reportTitle, (pageWidth - titleW) / 2, y + 5);
  y += 10;

  // —— Blue separator line ——
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += PDF_CONFIG.header.separatorHeightMm + PDF_CONFIG.header.marginBottomMm;

  // —— Centered image or video indicator ——
  const imgBlockY = y;
  if (data.imageDataUrl) {
    try {
      const { w: imgW, h: imgH } = await loadImageDimensions(data.imageDataUrl);
      const aspect = imgH / imgW;
      let fitW = Math.min(PDF_CONFIG.imageCol.maxWidthMm, contentWidth);
      let fitH = fitW * aspect;
      if (fitH > PDF_CONFIG.imageCol.maxHeightMm) {
        fitH = PDF_CONFIG.imageCol.maxHeightMm;
        fitW = fitH / aspect;
      }
      const imgX = margin + (contentWidth - fitW) / 2;
      const format = data.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(data.imageDataUrl, format, imgX, imgBlockY, fitW, fitH, undefined, 'FAST');
      
      // Add "Powered by" watermark at top center
      const watermarkText = POWERED_BY;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(50, 50, 50);
      const ww = doc.getTextWidth(watermarkText) + 3;
      doc.rect(imgX + (fitW - ww) / 2, imgBlockY + 1, ww, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(watermarkText, imgX + fitW / 2, imgBlockY + 3.8, { align: 'center' });
      
      // Add date and author overlay at bottom of image - author left, date right
      // Styled same as "Powered by" watermark
      if (data.author || data.publishedDate) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        const overlayPadding = 2;
        const overlayHeight = 4;
        const overlayY = imgBlockY + fitH - overlayHeight - overlayPadding;
        
        // Draw background same style as "Powered by" - dark background
        doc.setFillColor(50, 50, 50);
        doc.rect(imgX + overlayPadding, overlayY, fitW - overlayPadding * 2, overlayHeight, 'F');
        
        // Draw text - author on left, date on right (no labels, just values)
        doc.setTextColor(255, 255, 255);
        if (data.author) {
          doc.text(data.author, imgX + overlayPadding + 1, overlayY + 2.5);
        }
        if (data.publishedDate) {
          const dateWidth = doc.getTextWidth(data.publishedDate);
          doc.text(data.publishedDate, imgX + fitW - overlayPadding - dateWidth - 1, overlayY + 2.5);
        }
      }
      
      y = imgBlockY + fitH;
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY);
      doc.text('No image', margin + contentWidth / 2 - doc.getTextWidth('No image') / 2, imgBlockY + 15);
      y = imgBlockY + 25;
    }
  } else if (data.isVideo) {
    // Show "Video" text for videos
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    const videoText = 'Video';
    const videoTextW = doc.getTextWidth(videoText);
    doc.text(videoText, margin + (contentWidth - videoTextW) / 2, imgBlockY + 15);
    y = imgBlockY + 25;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('No image', margin + contentWidth / 2 - doc.getTextWidth('No image') / 2, imgBlockY + 15);
    y = imgBlockY + 25;
  }

  // Metadata is already rendered inside the image overlay; keep compact spacing.
  y += 8;

  // —— Description section (full width, with HTML color support) ——
  const descriptionHtml = data.description?.trim() ?? '';
  if (descriptionHtml) {
    y += PDF_CONFIG.description.headingMarginTopMm;
    doc.setFontSize(PDF_CONFIG.sectionHeading.fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('Description', margin, y + 5);
    y += 5 + PDF_CONFIG.dataCol.gapMm;

    // Use HTML rendering - preserves all formatting (bold, colors, lists, alignment, fonts)
    // HTML is the source of truth - no manual parsing needed
    y = await renderHtmlToPdf(
      doc,
      descriptionHtml,
      margin,
      y,
      contentWidth,
      maxY,
      {
        fontSize: PDF_CONFIG.description.fontSize,
        lineHeight: PDF_CONFIG.description.lineHeight,
        color: `#${PDF_CONFIG.description.color.map(c => c.toString(16).padStart(2, '0')).join('')}`,
      }
    );
  }

  // —— Report Date as signature (after description) ——
  y += 14;
  if (y > maxY - 20) {
    doc.addPage();
    y = margin;
  }
  const pdfGenerationDate = formatPdfDate(new Date());
  const reportDateText = `Report Date: ${pdfGenerationDate}`;
  doc.setFontSize(PDF_CONFIG.header.reportDateFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const reportDateW = doc.getTextWidth(reportDateText);
  doc.text(reportDateText, margin + (contentWidth - reportDateW) / 2, y + 5);

  const name = filename || `qualiphoto-${Date.now()}.pdf`;
  doc.save(name);
}

/** Row data for folder GEDs table PDF. */
export interface FolderGedRow {
  title: string;
  description: string;
  imageDataUrl: string | null;
  /** Display under the image (small type). */
  author?: string | null;
  /** Display under the image (small type), e.g. "03/02/2026". */
  publishedDate?: string;
  /** True if this is a video (imageDataUrl will be null for videos). */
  isVideo?: boolean;
}

export interface GenerateFolderPdfOptions {
  introduction?: string | null;
  conclusion?: string | null;
}

/** Premium folder PDF: centered title, intro, table (image + date/author under image | title + description), conclusion. */
const FOLDER_PDF = {
  marginMm: 7,
  titleFontSize: 18,
  titleSpacingBelowMm: 14,
  introFontSize: 10,
  introLineHeight: 1.5,
  introSpacingBelowMm: 12,
  introColor: GRAY,
  imageColWidthMm: 68,
  imageMaxHeightMm: 74,
  metaUnderImageFontSize: 7,
  metaUnderImageGapMm: 1,
  colGapMm: 4,
  headerFontSize: 10,
  rowTitleFontSize: 11,
  rowDescFontSize: 9.5,
  rowDescLineHeight: 1.5,
  /** Slightly darker than GRAY for more weight. */
  rowDescColor: [55, 55, 58] as [number, number, number],
  cellPaddingMm: 3,
  rowSeparatorLineWidth: 0.15,
  rowSeparatorColor: [230, 230, 230] as [number, number, number],
  conclusionMarginTopMm: 12,
  conclusionPaddingMm: 8,
  conclusionFontSize: 10,
  conclusionLineHeight: 1.5,
};

/**
 * Generate a premium folder PDF: centered title, introduction, table (image + date/author under image | title + description), conclusion.
 * Horizontal separators only; date and author under each image.
 */
export async function generateFolderGedsTablePdf(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string,
  options?: GenerateFolderPdfOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = FOLDER_PDF.marginMm;
  const { width: pageWidth, height: pageHeight } = getPageSize(doc);
  const contentWidth = pageWidth - 2 * margin;
  const textColWidth =
    contentWidth -
    FOLDER_PDF.imageColWidthMm -
    FOLDER_PDF.colGapMm -
    FOLDER_PDF.cellPaddingMm * 2;

  let y = margin;

  // —— 1. Header: centered title, bold, generous spacing ——
  const safeTitle = (folderTitle || 'Folder').trim() || 'Folder';
  doc.setFontSize(FOLDER_PDF.titleFontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  const titleWidth = doc.getTextWidth(safeTitle);
  doc.text(safeTitle, (pageWidth - titleWidth) / 2, y + 6);
  y += FOLDER_PDF.titleSpacingBelowMm;

  // —— 2. Introduction (under title) ——
  const introduction = options?.introduction?.trim() ?? '';
  if (introduction) {
    doc.setFontSize(FOLDER_PDF.introFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...FOLDER_PDF.introColor);
    const introLines = doc.splitTextToSize(stripHtml(introduction), contentWidth);
    const lineHeightMm =
      FOLDER_PDF.introFontSize * 0.35 * FOLDER_PDF.introLineHeight;
    for (let i = 0; i < introLines.length; i++) {
      doc.text(introLines[i], margin, y + FOLDER_PDF.introFontSize * 0.35);
      y += lineHeightMm;
    }
    y += FOLDER_PDF.introSpacingBelowMm;
  }

  const maxY = pageHeight - margin - 20;

  const drawTableHeaderLine = (startY: number) => {
    doc.setFontSize(FOLDER_PDF.headerFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    // Center "Constat" in the image column
    const constatText = 'Constat';
    const constatTextW = doc.getTextWidth(constatText);
    const constatCenterX = margin + FOLDER_PDF.imageColWidthMm / 2;
    doc.text(constatText, constatCenterX - constatTextW / 2, startY + 5);
    // Center "Remarks" in the text column
    const remarksText = 'Remarks';
    const remarksTextW = doc.getTextWidth(remarksText);
    const remarksCenterX = margin + FOLDER_PDF.imageColWidthMm + FOLDER_PDF.colGapMm + textColWidth / 2;
    doc.text(remarksText, remarksCenterX - remarksTextW / 2, startY + 5);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.35);
    doc.line(margin, startY + 7, pageWidth - margin, startY + 7);
  };

  if (rows.length === 0) {
    drawTableHeaderLine(y);
    y += 10;
    doc.setFontSize(FOLDER_PDF.rowDescFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('No items.', margin, y + 5);
    y += 12;
    // Still render conclusion if present
  } else {
    const lineHeightDesc =
      FOLDER_PDF.rowDescFontSize * 0.35 * FOLDER_PDF.rowDescLineHeight;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const imageH = Math.min(
        FOLDER_PDF.imageMaxHeightMm,
        FOLDER_PDF.imageMaxHeightMm
      );
      const metaH = FOLDER_PDF.cellPaddingMm;
      // Estimate line count for height calculation (HTML rendering will handle actual formatting)
      const descText = stripHtml(row.description || '').trim().slice(0, 800);
      const descLineCount = doc.splitTextToSize(descText, textColWidth).length;
      const descH =
        Math.min(descLineCount, 8) * lineHeightDesc +
        FOLDER_PDF.rowTitleFontSize * 0.35 +
        FOLDER_PDF.cellPaddingMm * 2;
      const rowHeight = Math.max(
        imageH + metaH + FOLDER_PDF.cellPaddingMm * 2,
        descH + FOLDER_PDF.cellPaddingMm * 2
      );

      if (y + rowHeight > maxY) {
        doc.addPage();
        y = margin;
      }

      if (i === 0) {
        drawTableHeaderLine(y);
        y += 10;
      }

      const rowY = y;
      const imgColX = margin + FOLDER_PDF.cellPaddingMm;
      const textColX = margin + FOLDER_PDF.imageColWidthMm + FOLDER_PDF.colGapMm + FOLDER_PDF.cellPaddingMm;

      // —— Left column: image or video placeholder ——
      if (row.imageDataUrl) {
        try {
          const { w: imgW, h: imgH } = await loadImageDimensions(row.imageDataUrl);
          const aspect = imgH / imgW;
          let fitW = FOLDER_PDF.imageColWidthMm - FOLDER_PDF.cellPaddingMm * 2;
          let fitH = fitW * aspect;
          if (fitH > FOLDER_PDF.imageMaxHeightMm) {
            fitH = FOLDER_PDF.imageMaxHeightMm;
            fitW = fitH / aspect;
          }
          const imgX = margin + (FOLDER_PDF.imageColWidthMm - fitW) / 2;
          const imgY = rowY + FOLDER_PDF.cellPaddingMm;
          const format = row.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(
            row.imageDataUrl,
            format,
            imgX,
            imgY,
            fitW,
            fitH,
            undefined,
            'NONE'
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
          
          // Add date and author overlay at bottom of image - author left, date right
          // Styled same as "Powered by" watermark
          if (row.author || row.publishedDate) {
            doc.setFontSize(4.5);
            doc.setFont('helvetica', 'normal');
            const overlayPadding = 1.5;
            const overlayHeight = 3.5;
            const overlayY = imgY + fitH - overlayHeight - overlayPadding;
            
            // Draw background same style as "Powered by" - dark background
            doc.setFillColor(50, 50, 50);
            doc.rect(imgX + overlayPadding, overlayY, fitW - overlayPadding * 2, overlayHeight, 'F');
            
            // Draw text - author on left, date on right (no labels, just values)
            doc.setTextColor(255, 255, 255);
            if (row.author) {
              doc.text(row.author, imgX + overlayPadding + 0.5, overlayY + 2);
            }
            if (row.publishedDate) {
              const dateWidth = doc.getTextWidth(row.publishedDate);
              doc.text(row.publishedDate, imgX + fitW - overlayPadding - dateWidth - 0.5, overlayY + 2);
            }
          }
          
        } catch {
          doc.setFontSize(FOLDER_PDF.rowDescFontSize);
          doc.setTextColor(...GRAY);
          doc.text('—', imgColX, rowY + FOLDER_PDF.cellPaddingMm + 8);
        }
      } else if (row.isVideo) {
        // Show "Video" text for videos
        doc.setFontSize(FOLDER_PDF.rowDescFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        const videoText = 'Video';
        const videoTextW = doc.getTextWidth(videoText);
        doc.text(videoText, imgColX + (FOLDER_PDF.imageColWidthMm - FOLDER_PDF.cellPaddingMm * 2 - videoTextW) / 2, rowY + FOLDER_PDF.cellPaddingMm + 8);
      }

      // —— Right column: title (bold) + description (no label) ——
      doc.setFontSize(FOLDER_PDF.rowTitleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const titleText = (row.title || '—').trim().slice(0, 120);
      const titleLines = doc.splitTextToSize(titleText, textColWidth);
      let textY = rowY + FOLDER_PDF.cellPaddingMm;
      doc.text(titleLines[0] ?? '—', textColX, textY + FOLDER_PDF.rowTitleFontSize * 0.35);
      textY += FOLDER_PDF.rowTitleFontSize * 0.35 + 2;

      // Use HTML rendering for descriptions - preserves all formatting perfectly
      const rowDescription = (row.description || '').trim().slice(0, 800);
      if (rowDescription) {
        const descY = await renderHtmlToPdf(
          doc,
          rowDescription,
          textColX,
          textY,
          textColWidth,
          rowY + rowHeight, // Max height constraint
          {
            fontSize: FOLDER_PDF.rowDescFontSize,
            lineHeight: FOLDER_PDF.rowDescLineHeight,
            color: `#${FOLDER_PDF.rowDescColor.map(c => c.toString(16).padStart(2, '0')).join('')}`,
          }
        );
        textY = descY;
      }

      // Horizontal separator only (no vertical borders)
      doc.setDrawColor(...FOLDER_PDF.rowSeparatorColor);
      doc.setLineWidth(FOLDER_PDF.rowSeparatorLineWidth);
      doc.line(margin, rowY + rowHeight, pageWidth - margin, rowY + rowHeight);

      y = rowY + rowHeight + 3;
    }
  }

  // —— 5. Conclusion (distinct section) ——
  const conclusion = options?.conclusion?.trim() ?? '';
  if (conclusion) {
    let conclY = y + FOLDER_PDF.conclusionMarginTopMm;
    if (conclY > maxY - 30) {
      doc.addPage();
      conclY = margin;
    }
    doc.setDrawColor(...FOLDER_PDF.rowSeparatorColor);
    doc.setLineWidth(0.4);
    doc.line(margin, conclY - 4, pageWidth - margin, conclY - 4);
    doc.setFontSize(FOLDER_PDF.conclusionFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const conclLines = doc.splitTextToSize(
      stripHtml(conclusion),
      contentWidth - FOLDER_PDF.conclusionPaddingMm * 2,
    );
    const conclLineH =
      FOLDER_PDF.conclusionFontSize * 0.35 * FOLDER_PDF.conclusionLineHeight;
    let cy = conclY + FOLDER_PDF.conclusionPaddingMm;
    for (let i = 0; i < conclLines.length; i++) {
      if (cy + conclLineH > pageHeight - margin - 10) {
        doc.addPage();
        cy = margin + FOLDER_PDF.conclusionPaddingMm;
      }
      doc.text(conclLines[i], margin + FOLDER_PDF.conclusionPaddingMm, cy + FOLDER_PDF.conclusionFontSize * 0.35);
      cy += conclLineH;
    }
  }

  const name = filename || `folder-${Date.now()}.pdf`;
  doc.save(name);
}
