/**
 * Utilities for adding text overlays (date, author, powered by) on images.
 * Used in both PDF and DOCX generation.
 */

export async function addTextOverlayToImage(
  imageDataUrl: string,
  options: {
    date?: string;
    author?: string | null;
    poweredBy?: string;
    position?: 'bottom' | 'top';
    outputWidth?: number;
    outputHeight?: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const outputWidth = Math.max(1, Math.round(options.outputWidth ?? img.width));
      const outputHeight = Math.max(1, Math.round(options.outputHeight ?? img.height));

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const { date, author, poweredBy, position = 'bottom' } = options;

      const aspectRatio = canvas.width / Math.max(canvas.height, 1);
      const isPortrait = aspectRatio < 0.8;

      const SMALL_IMAGE_THRESHOLD = 150;
      const isPortraitForBelow = aspectRatio < 0.75;
      const isVerySmall =
        canvas.width < SMALL_IMAGE_THRESHOLD || isPortraitForBelow;

      const baseScale = canvas.width / 220;
      const minScale = isPortrait ? 0.6 : 0.8;
      const maxScale = isPortrait ? 1.0 : 1.3;
      const scale = Math.max(minScale, Math.min(maxScale, baseScale));

      const padding = Math.max(4, Math.round(6 * scale));
      const fontSize = Math.max(10, Math.round(14 * scale));
      const fontFamily = 'Arial, sans-serif';

      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const authorText = author
        ? author.startsWith('Author:')
          ? author.replace('Author: ', '')
          : author
        : '';

      const dateText = date
        ? date.startsWith('Date:')
          ? date.replace('Date: ', '')
          : date
        : '';

      const originalHeight = canvas.height;
      let textAreaHeight = 0;

      if (isVerySmall && (authorText || dateText)) {
        const lineHeight = Math.round(fontSize * 1.4);
        textAreaHeight = lineHeight * 2 + padding * 2 + 6;
        canvas.height = originalHeight + textAreaHeight;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      try {
        const imageHeight =
          isVerySmall && (authorText || dateText)
            ? originalHeight
            : canvas.height;
        ctx.drawImage(img, 0, 0, canvas.width, imageHeight);
      } catch (err) {
        resolve(imageDataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = false;

      const drawDarkBand = (
        y: number,
        height: number,
        drawText: () => void
      ) => {
        ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
        ctx.fillRect(
          Math.round(padding),
          Math.round(y),
          Math.round(canvas.width - padding * 2),
          Math.round(height)
        );

        ctx.fillStyle = '#ffffff';
        drawText();
      };

      /** ---------- TOP POWERED BY ---------- */
      if (poweredBy && poweredBy.trim()) {
        const h = Math.round(fontSize * 1.4);
        drawDarkBand(padding, h, () => {
          ctx.font = `bold ${fontSize}px ${fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            poweredBy.trim(),
            Math.round(canvas.width / 2),
            Math.round(padding + h / 2)
          );
        });
      }

      /** ---------- BOTTOM AUTHOR / DATE ---------- */
      if (authorText || dateText) {
        const lineHeight = Math.round(fontSize * 1.4);

        let bandY: number;
        let bandHeight: number;

        if (isVerySmall) {
          bandY = originalHeight;
          bandHeight = lineHeight * 2 + padding * 2 + 6;
        } else {
          bandHeight = lineHeight + padding * 2;
          bandY =
            position === 'top'
              ? padding
              : canvas.height - bandHeight - padding;
        }

        drawDarkBand(bandY, bandHeight, () => {
          let textY = Math.round(bandY + padding + 2);
          const textX = Math.round(padding + 8);

          if (isVerySmall) {
            /** DATE — FIRST LINE (for debugging: check if date renders) */
            if (dateText) {
              ctx.font = `${Math.max(9, fontSize - 1)}px ${fontFamily}`;
              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.textAlign = 'left';
              ctx.fillText(dateText, textX, textY);
              textY += lineHeight;
            }

            /** AUTHOR — SECOND LINE (after date to check if hidden or missing) */
            if (authorText) {
              ctx.font = `bold ${fontSize}px ${fontFamily}`;
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'left';
              ctx.fillText(authorText, textX, textY);
            }
          } else {
            /** NORMAL OVERLAY MODE */
            if (authorText) {
              ctx.font = `bold ${fontSize}px ${fontFamily}`;
              ctx.textAlign = 'left';
              ctx.fillText(authorText, textX, textY);
            }

            if (dateText) {
              ctx.font = `${fontSize}px ${fontFamily}`;
              ctx.textAlign = 'right';
              ctx.fillText(
                dateText,
                Math.round(canvas.width - padding - 8),
                textY
              );
            }
          }
        });
      }

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

/**
 * Format date and author for overlay display.
 */
export function formatImageOverlayText(
  date?: string,
  author?: string | null
): { dateText: string; authorText: string } {
  return {
    dateText: date ? `Date: ${date}` : '',
    authorText: author ? `Author: ${author}` : '',
  };
}
