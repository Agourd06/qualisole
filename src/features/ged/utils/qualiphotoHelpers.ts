import { UPLOADS_BASE } from '../../../utils/constants';
import type { GedItem } from '../types/ged.types';

export function buildImageUrl(ged: GedItem): string {
  const url = ged?.url;
  if (!url || typeof url !== 'string') return '';
  const path = url.startsWith('/') ? url : `/${url}`;
  const base = UPLOADS_BASE?.replace?.(/\/$/, '') ?? '';
  if (!base) return '';
  return `${base}${path}`;
}

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url);
}

/** Video extensions shown in qualiphoto galleries (e.g. .mov, .mp4). */
export function isVideoUrl(url: string): boolean {
  return /\.(mov|mp4|webm|ogg)(\?|$)/i.test(url);
}

/** Audio extensions (e.g. .m4a, .mp3). */
export function isAudioUrl(url: string): boolean {
  return /\.(m4a|mp3|wav|ogg|aac|webm)(\?|$)/i.test(url);
}

/** Image or video URL – item is shown in left/right galleries. */
export function isImageOrVideoUrl(url: string): boolean {
  return isImageUrl(url) || isVideoUrl(url);
}

/** Image, video, or audio – item is shown in GED lists and modals. */
export function isMediaUrl(url: string): boolean {
  return isImageUrl(url) || isVideoUrl(url) || isAudioUrl(url);
}

/** 'image' | 'video' | 'audio' for a GED url. */
export function getMediaType(url: string): 'image' | 'video' | 'audio' {
  if (isVideoUrl(url)) return 'video';
  if (isAudioUrl(url)) return 'audio';
  return 'image';
}

export function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format ISO date for display (e.g. 29/01/2026). Returns "—" if invalid or missing. */
export function formatDisplayDate(iso: string | null | undefined): string {
  if (iso == null || typeof iso !== 'string') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date().toISOString());
}
