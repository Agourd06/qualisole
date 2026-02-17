/**
 * Fetch an image as binary (Uint8Array).
 * No custom headers = no CORS preflight (avoids OPTIONS 405 when backend
 * doesn't support it). Works if uploads are public or served without auth.
 */
export async function fetchImageAsBinary(
  imageUrl: string,
): Promise<{ data: Uint8Array; type: 'jpg' | 'png' } | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const data = new Uint8Array(buffer);
    const contentType = res.headers.get('content-type') ?? '';
    const type = contentType.includes('png') ? 'png' : 'jpg';
    return { data, type };
  } catch {
    return null;
  }
}

/**
 * Normalize image orientation by drawing to canvas.
 * Phones/cameras use EXIF orientation; browsers apply it for <img>, but raw pixel
 * data (used by PDF/Word) ignores EXIF, causing rotated images.
 * Drawing to canvas bakes the correct orientation into the output.
 */
async function normalizeImageOrientation(dataUrl: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const mime = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        const out = canvas.toDataURL(mime, 0.92);
        resolve(out);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Fetch an image as a data URL (base64).
 * No custom headers = no CORS preflight (avoids OPTIONS 405 when backend
 * doesn't support it). Works if uploads are public or served without auth.
 * Orientation is normalized so PDF/Word display correctly (EXIF fix).
 */
export async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return await normalizeImageOrientation(dataUrl);
  } catch {
    return null;
  }
}

/**
 * Convert a data URL to Uint8Array + type for docx ImageRun.
 * docx accepts Uint8Array (not ArrayBuffer) for reliable embedding.
 */
export function dataUrlToUint8Array(
  dataUrl: string,
): { data: Uint8Array; type: 'png' | 'jpg' } {
  const [header, base64] = dataUrl.split(',');
  const type = header?.includes('png') ? 'png' : 'jpg';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { data: bytes, type };
}
