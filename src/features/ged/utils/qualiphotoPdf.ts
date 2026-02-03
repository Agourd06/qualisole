import { jsPDF } from 'jspdf';

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
  /** Left column: image */
  imageCol: {
    widthMm: 75,
    maxHeightMm: 95,
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
  let y = marginTop;

  // —— Header: Title (left) + Report Date (right) ——
  const reportTitle = (data.title.trim() || 'IMAGE DATA REPORT').toUpperCase();
  doc.setFontSize(PDF_CONFIG.header.titleFontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text(reportTitle, margin, y + 5);

  doc.setFontSize(PDF_CONFIG.header.reportDateFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  const pdfGenerationDate = formatPdfDate(new Date());
  const reportDateText = `Report Date: ${pdfGenerationDate}`;
  doc.text(reportDateText, pageWidth - margin - doc.getTextWidth(reportDateText), y + 5);

  y += 10;

  // —— Blue separator line ——
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += PDF_CONFIG.header.separatorHeightMm + PDF_CONFIG.header.marginBottomMm;

  const rowStartY = y;
  const colGap = 10;
  const imageColW = PDF_CONFIG.imageCol.widthMm;
  const dataColX = margin + imageColW + colGap;

  // —— Left column: Image ——
  let imageBottomY = rowStartY;
  if (data.imageDataUrl) {
    try {
      const { w: imgW, h: imgH } = await loadImageDimensions(data.imageDataUrl);
      const aspect = imgH / imgW;
      let fitW = imageColW;
      let fitH = fitW * aspect;
      if (fitH > PDF_CONFIG.imageCol.maxHeightMm) {
        fitH = PDF_CONFIG.imageCol.maxHeightMm;
        fitW = fitH / aspect;
      }
      const imgX = margin + (imageColW - fitW) / 2;
      const format = data.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(data.imageDataUrl, format, imgX, rowStartY, fitW, fitH, undefined, 'FAST');
      imageBottomY = rowStartY + fitH;
    } catch {
      imageBottomY = rowStartY + 20;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('No image', margin + imageColW / 2 - doc.getTextWidth('No image') / 2, rowStartY + 15);
    imageBottomY = rowStartY + 25;
  }

  // —— Image date (next to image, in left column) ——
  doc.setFontSize(PDF_CONFIG.dataCol.valueFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const imageDateText = `Image date: ${data.publishedDate}`;
  doc.text(imageDateText, margin, imageBottomY + 5);
  imageBottomY += 8;

  // —— Right column: Data (Image Overview style) ——
  doc.setFontSize(PDF_CONFIG.sectionHeading.fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('Image Overview', dataColX, y + 5);
  y += 5 + PDF_CONFIG.dataCol.gapMm;

  doc.setFontSize(PDF_CONFIG.dataCol.valueFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  const lineH = PDF_CONFIG.dataCol.valueFontSize * 0.45;
  const bullets = [
    `Author: ${data.author ?? '—'}`,
  ];
  bullets.forEach((line) => {
    doc.text(`• ${line}`, dataColX, y + lineH);
    y += lineH + PDF_CONFIG.dataCol.gapMm;
  });

  const rowEndY = Math.max(imageBottomY, y) + 4;
  y = rowEndY;

  // —— Description section (full width, below image + data) ——
  const descriptionText = stripHtml(data.description);
  if (descriptionText) {
    y += PDF_CONFIG.description.headingMarginTopMm;
    doc.setFontSize(PDF_CONFIG.sectionHeading.fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('Description', margin, y + 5);
    y += 5 + PDF_CONFIG.dataCol.gapMm;

    doc.setFontSize(PDF_CONFIG.description.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.description.color);
    const lineHeightMm =
      PDF_CONFIG.description.fontSize * 0.35 * PDF_CONFIG.description.lineHeight;
    const descLines = doc.splitTextToSize(descriptionText, contentWidth);
    const maxY = pageHeight - margin - 15;
    for (let i = 0; i < descLines.length; i++) {
      if (y + lineHeightMm > maxY) {
        doc.addPage();
        y = margin;
      }
      doc.text(descLines[i], margin, y + PDF_CONFIG.description.fontSize * 0.35);
      y += lineHeightMm;
    }
  }

  const name = filename || `qualiphoto-${Date.now()}.pdf`;
  doc.save(name);
}

/** Row data for folder GEDs table PDF (image as data URL, title and description text). */
export interface FolderGedRow {
  title: string;
  description: string;
  imageDataUrl: string | null;
}

const FOLDER_TABLE_CONFIG = {
  imageColWidthMm: 32,
  titleColWidthMm: 42,
  /** Description gets remaining width. */
  rowImageHeightMm: 26,
  headerFontSize: 10,
  cellFontSize: 9,
  cellPaddingMm: 2,
};

/**
 * Generate a PDF with a table: one row per GED, columns [Image | Title | Description].
 * Used for "folder PDF" next to folder name.
 */
export async function generateFolderGedsTablePdf(
  folderTitle: string,
  rows: FolderGedRow[],
  filename?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  const { width: pageWidth, height: pageHeight } = getPageSize(doc);
  const contentWidth = pageWidth - 2 * margin;
  const descColWidth =
    contentWidth -
    FOLDER_TABLE_CONFIG.imageColWidthMm -
    FOLDER_TABLE_CONFIG.titleColWidthMm -
    FOLDER_TABLE_CONFIG.cellPaddingMm * 6;

  let y = margin;

  const drawTableHeader = (startY: number) => {
    doc.setFontSize(FOLDER_TABLE_CONFIG.headerFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    let x = margin;
    doc.text('Image', x + FOLDER_TABLE_CONFIG.cellPaddingMm, startY + 5);
    x += FOLDER_TABLE_CONFIG.imageColWidthMm + FOLDER_TABLE_CONFIG.cellPaddingMm * 2;
    doc.text('Title', x + FOLDER_TABLE_CONFIG.cellPaddingMm, startY + 5);
    x += FOLDER_TABLE_CONFIG.titleColWidthMm + FOLDER_TABLE_CONFIG.cellPaddingMm * 2;
    doc.text('Description', x + FOLDER_TABLE_CONFIG.cellPaddingMm, startY + 5);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.line(margin, startY + 7, pageWidth - margin, startY + 7);
  };

  // Title: folder name (centred)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  const safeTitle = (folderTitle || 'Folder').trim() || 'Folder';
  const titleWidth = doc.getTextWidth(safeTitle);
  doc.text(safeTitle, (pageWidth - titleWidth) / 2, y + 6);
  y += 14;

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('No items.', margin, y + 6);
    doc.save(filename || `folder-${Date.now()}.pdf`);
    return;
  }

  const lineHeightMm = FOLDER_TABLE_CONFIG.cellFontSize * 0.4;
  const maxY = pageHeight - margin - 10;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowHeight = Math.max(
      FOLDER_TABLE_CONFIG.rowImageHeightMm + FOLDER_TABLE_CONFIG.cellPaddingMm * 2,
      lineHeightMm * 2 + FOLDER_TABLE_CONFIG.cellPaddingMm * 2
    );

    if (i === 0 || y + rowHeight > maxY) {
      if (y > margin && i > 0) {
        doc.addPage();
        y = margin;
      }
      drawTableHeader(y);
      y += 10;
    }

    const rowY = y;
    let x = margin + FOLDER_TABLE_CONFIG.cellPaddingMm;

    // Column 1: Image
    if (row.imageDataUrl) {
      try {
        const { w: imgW, h: imgH } = await loadImageDimensions(row.imageDataUrl);
        const aspect = imgH / imgW;
        let fitW = FOLDER_TABLE_CONFIG.imageColWidthMm;
        let fitH = fitW * aspect;
        if (fitH > FOLDER_TABLE_CONFIG.rowImageHeightMm) {
          fitH = FOLDER_TABLE_CONFIG.rowImageHeightMm;
          fitW = fitH / aspect;
        }
        const imgX = margin + (FOLDER_TABLE_CONFIG.imageColWidthMm - fitW) / 2;
        const format = row.imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(
          row.imageDataUrl,
          format,
          imgX,
          rowY + FOLDER_TABLE_CONFIG.cellPaddingMm,
          fitW,
          fitH,
          undefined,
          'FAST'
        );
      } catch {
        doc.setFontSize(FOLDER_TABLE_CONFIG.cellFontSize);
        doc.setTextColor(...GRAY);
        doc.text('—', x, rowY + FOLDER_TABLE_CONFIG.rowImageHeightMm / 2);
      }
    } else {
      doc.setFontSize(FOLDER_TABLE_CONFIG.cellFontSize);
      doc.setTextColor(...GRAY);
      doc.text('—', x, rowY + FOLDER_TABLE_CONFIG.rowImageHeightMm / 2);
    }

    x += FOLDER_TABLE_CONFIG.imageColWidthMm + FOLDER_TABLE_CONFIG.cellPaddingMm * 2;

    // Column 2: Title
    doc.setFontSize(FOLDER_TABLE_CONFIG.cellFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    const titleText = (row.title || '—').trim().slice(0, 80);
    const titleLines = doc.splitTextToSize(titleText, FOLDER_TABLE_CONFIG.titleColWidthMm);
    doc.text(titleLines[0] ?? '—', x, rowY + FOLDER_TABLE_CONFIG.cellPaddingMm + lineHeightMm);
    if (titleLines.length > 1) {
      doc.text(titleLines[1], x, rowY + FOLDER_TABLE_CONFIG.cellPaddingMm + lineHeightMm * 2);
    }

    x += FOLDER_TABLE_CONFIG.titleColWidthMm + FOLDER_TABLE_CONFIG.cellPaddingMm * 2;

    // Column 3: Description
    doc.setTextColor(...GRAY);
    const descText = stripHtml(row.description || '').slice(0, 500);
    const descLines = doc.splitTextToSize(descText, descColWidth);
    let dy = FOLDER_TABLE_CONFIG.cellPaddingMm;
    for (let l = 0; l < Math.min(descLines.length, 4); l++) {
      doc.text(descLines[l], x, rowY + dy + lineHeightMm);
      dy += lineHeightMm;
    }

    // Row border (light)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, rowY + rowHeight, pageWidth - margin, rowY + rowHeight);

    y = rowY + rowHeight + 2;
  }

  doc.save(filename || `folder-${Date.now()}.pdf`);
}
