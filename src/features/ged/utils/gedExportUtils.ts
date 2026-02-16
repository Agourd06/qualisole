import { getStoredAuth } from '../../../utils/authStorage';

/**
 * Fetch an image as binary (Uint8Array) with auth.
 * Use this when embedding images in PDF/Word so the document is self-contained
 * and works when opened on any host (manager's machine, etc.).
 *
 * Bypasses CORS, cookies, and hosting differences by embedding raw binary.
 */
export async function fetchImageAsBinary(
  imageUrl: string,
): Promise<{ data: Uint8Array; type: 'jpg' | 'png' } | null> {
  const { token } = getStoredAuth();
  try {
    const res = await fetch(imageUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
 * Fetch an image as a data URL (base64) with auth.
 * Use for jsPDF and other consumers that accept data URLs.
 */
export async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  const { token } = getStoredAuth();
  try {
    const res = await fetch(imageUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
