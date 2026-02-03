import { UPLOADS_BASE } from '../../../utils/constants';
import type { GedItem } from '../types/ged.types';

export function buildImageUrl(ged: GedItem): string {
  const path = ged.url.startsWith('/') ? ged.url : `/${ged.url}`;
  return `${UPLOADS_BASE.replace(/\/$/, '')}${path}`;
}

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url);
}

export function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format ISO date for display (e.g. 29/01/2026). */
export function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date().toISOString());
}
