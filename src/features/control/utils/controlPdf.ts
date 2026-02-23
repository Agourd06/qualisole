import { jsPDF } from 'jspdf';
import { fetchImageAsDataUrl } from '../../ged/utils/gedExportUtils';

type Rgb = [number, number, number];

const BLUE: Rgb = [0, 82, 155];
const BLACK: Rgb = [38, 38, 38];
const GRAY: Rgb = [107, 114, 128];

export interface ControlGedRow {
  title: string;
  answer: string;
  imageUrl: string | null;
}

export async function exportControlExecutionPdf(
  executionTitle: string,
  rows: ControlGedRow[],
  filename?: string,
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header: centered execution title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BLUE);
  const safeTitle = executionTitle || 'Exécution';
  const headerLines = doc.splitTextToSize(safeTitle, contentWidth);
  headerLines.forEach((line: string, index: number) => {
    const lineY = y + 5 + index * 6;
    const lineWidth = doc.getTextWidth(line);
    const lineX = (pageWidth - lineWidth) / 2;
    doc.text(line, lineX, lineY);
  });
  y += 5 + headerLines.length * 6;

  // Separator line between title and data
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  const separatorY = y + 3;
  doc.line(margin, separatorY, pageWidth - margin, separatorY);
  y = separatorY + 4;

  // Columns: [Title + Answer] | [Image small right]
  const textColWidth = contentWidth * 0.6;
  const imageColWidth = contentWidth * 0.34;
  const rowGap = 4;
  const maxY = pageHeight - margin - 10;

  for (const row of rows) {
    if (y > maxY) {
      doc.addPage();
      y = margin;
    }

    const titleText = row.title || '—';
    const answerText = row.answer || '—';

    const titleLines = doc.splitTextToSize(titleText, textColWidth);
    const answerLines = doc.splitTextToSize(answerText, textColWidth);

    const lineHeight = 5;
    const textHeight =
      (titleLines.length + answerLines.length) * lineHeight + 2;
    const imageHeight = 26;
    const rowHeight = Math.max(textHeight, imageHeight);

    // Text block
    let localY = y;
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    titleLines.forEach((line: string) => {
      doc.text(line, margin, localY + lineHeight);
      localY += lineHeight;
    });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    answerLines.forEach((line: string) => {
      doc.text(line, margin, localY + lineHeight);
      localY += lineHeight;
    });

    // Image on the right
    if (row.imageUrl) {
      try {
        const dataUrl = await fetchImageAsDataUrl(row.imageUrl);
        if (dataUrl) {
          const imgWidth = imageColWidth;
          const imgHeight = imageHeight;
          const imgX =
            margin + textColWidth + (contentWidth - textColWidth - imgWidth);
          const imgY = y;
          doc.addImage(dataUrl, 'JPEG', imgX, imgY, imgWidth, imgHeight);
        }
      } catch {
        // ignore image errors
      }
    }

    // Row separator
    y += rowHeight + rowGap;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentWidth, y);
  }

  const safeName =
    filename ||
    `execution-${Date.now()}.pdf`;
  doc.save(safeName);
}

