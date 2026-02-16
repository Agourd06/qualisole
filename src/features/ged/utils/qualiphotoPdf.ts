import { jsPDF } from 'jspdf';
import { htmlToSegments, hexToRgb } from './htmlToSegments';

/** Blue accent (report style, like IMAGE DATA REPORT). Customize via theme. */
const BLUE = [0, 82, 155] as [number, number, number];
const BLACK = [38, 38, 38] as [number, number, number];
const GRAY = [107, 114, 128] as [number, number, number];

const PDF_CONFIG = {
  page: {
    format: 'a4' as const,
    marginMm: 20,
    marginTopMm: 22,
  },
  header: {
    titleFontSize: 18,
    reportDateFontSize: 10,
    separatorHeightMm: 0.8,
    marginBottomMm: 14,
  },
  /** Centered image block */
  imageCol: {
    maxWidthMm: 120,
    maxHeightMm: 100,
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

  // —— Centered image ——
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
      y = imgBlockY + fitH;
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY);
      doc.text('No image', margin + contentWidth / 2 - doc.getTextWidth('No image') / 2, imgBlockY + 15);
      y = imgBlockY + 25;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('No image', margin + contentWidth / 2 - doc.getTextWidth('No image') / 2, imgBlockY + 15);
    y = imgBlockY + 25;
  }

  // —— Author and date under image (centered) ——
  y += 4;
  doc.setFontSize(PDF_CONFIG.dataCol.valueFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const metaParts = [data.author, `Image date: ${data.publishedDate}`].filter(Boolean);
  const metaLine = metaParts.length ? metaParts.join('  ·  ') : `Image date: ${data.publishedDate}`;
  const metaW = doc.getTextWidth(metaLine);
  doc.text(metaLine, margin + (contentWidth - metaW) / 2, y + 4);
  y += 12;

  // —— Description section (full width, with HTML color support) ——
  const descriptionHtml = data.description?.trim() ?? '';
  if (descriptionHtml) {
    y += PDF_CONFIG.description.headingMarginTopMm;
    doc.setFontSize(PDF_CONFIG.sectionHeading.fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('Description', margin, y + 5);
    y += 5 + PDF_CONFIG.dataCol.gapMm;

    doc.setFontSize(PDF_CONFIG.description.fontSize);
    doc.setFont('helvetica', 'normal');
    const lineHeightMm =
      PDF_CONFIG.description.fontSize * 0.35 * PDF_CONFIG.description.lineHeight;

    const segments = htmlToSegments(descriptionHtml);
    const hasFormatting = segments.some((s) => s.color || s.backgroundColor);
    if (hasFormatting && segments.length > 0) {
      for (const seg of segments) {
        const lines = doc.splitTextToSize(seg.text, contentWidth);
        const segColor = seg.color ? hexToRgb(seg.color) : PDF_CONFIG.description.color;
        const segBg = seg.backgroundColor ? hexToRgb(seg.backgroundColor) : null;
        for (const line of lines) {
          if (y + lineHeightMm > maxY) {
            doc.addPage();
            y = margin;
          }
          if (segBg) {
            doc.setFillColor(...segBg);
            const lineW = doc.getTextWidth(line);
            const lineH = PDF_CONFIG.description.fontSize * 0.4;
            doc.rect(margin, y, lineW, lineH, 'F');
          }
          doc.setTextColor(...segColor);
          doc.text(line, margin, y + PDF_CONFIG.description.fontSize * 0.35);
          y += lineHeightMm;
        }
      }
    } else {
      const plainText = stripHtml(descriptionHtml);
      const descLines = doc.splitTextToSize(plainText, contentWidth);
      doc.setTextColor(...PDF_CONFIG.description.color);
      for (let i = 0; i < descLines.length; i++) {
        if (y + lineHeightMm > maxY) {
          doc.addPage();
          y = margin;
        }
        doc.text(descLines[i], margin, y + PDF_CONFIG.description.fontSize * 0.35);
        y += lineHeightMm;
      }
    }
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
  imageColWidthMm: 52,
  imageMaxHeightMm: 48,
  metaUnderImageFontSize: 7,
  metaUnderImageGapMm: 1,
  colGapMm: 4,
  headerFontSize: 10,
  rowTitleFontSize: 11,
  rowDescFontSize: 9,
  rowDescLineHeight: 1.45,
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
    doc.text('Image', margin + FOLDER_PDF.cellPaddingMm, startY + 5);
    doc.text('Title', margin + FOLDER_PDF.imageColWidthMm + FOLDER_PDF.colGapMm + FOLDER_PDF.cellPaddingMm, startY + 5);
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
      const metaH =
        (row.publishedDate || row.author
          ? FOLDER_PDF.metaUnderImageFontSize * 0.35 + FOLDER_PDF.metaUnderImageGapMm
          : 0) + FOLDER_PDF.cellPaddingMm;
      const descText = stripHtml(row.description || '').trim().slice(0, 800);
      const descLinesForRow = doc.splitTextToSize(descText, textColWidth);
      const descH =
        Math.min(descLinesForRow.length, 8) * lineHeightDesc +
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

      // —— Left column: image then date & author under it ——
      let imageBottomY = rowY + FOLDER_PDF.cellPaddingMm;
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
          const format = row.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(
            row.imageDataUrl,
            format,
            imgX,
            rowY + FOLDER_PDF.cellPaddingMm,
            fitW,
            fitH,
            undefined,
            'NONE'
          );
          imageBottomY = rowY + FOLDER_PDF.cellPaddingMm + fitH;
        } catch {
          doc.setFontSize(FOLDER_PDF.rowDescFontSize);
          doc.setTextColor(...GRAY);
          doc.text('—', imgColX, rowY + FOLDER_PDF.cellPaddingMm + 8);
          imageBottomY = rowY + FOLDER_PDF.cellPaddingMm + 12;
        }
      }

      doc.setFontSize(FOLDER_PDF.metaUnderImageFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      if (row.publishedDate || row.author) {
        imageBottomY += FOLDER_PDF.metaUnderImageGapMm;
        const metaY = imageBottomY + FOLDER_PDF.metaUnderImageFontSize * 0.35;
        const imgColRight = margin + FOLDER_PDF.imageColWidthMm - FOLDER_PDF.cellPaddingMm;
        if (row.publishedDate) {
          doc.text(row.publishedDate, imgColX, metaY);
        }
        if (row.author) {
          doc.text(row.author, imgColRight, metaY, { align: 'right' });
        }
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

      doc.setFontSize(FOLDER_PDF.rowDescFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...FOLDER_PDF.rowDescColor);
      for (let l = 0; l < Math.min(descLinesForRow.length, 10); l++) {
        doc.text(descLinesForRow[l], textColX, textY + FOLDER_PDF.rowDescFontSize * 0.35);
        textY += lineHeightDesc;
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

  doc.save(filename || `folder-${Date.now()}.pdf`);
}
