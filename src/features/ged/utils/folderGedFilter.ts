import type { GedItem } from '../types/ged.types';
import { isImageUrl } from './qualiphotoHelpers';

/**
 * Returns only GEDs that belong to the given folder (idsource === folderId).
 * Use this for folder-scoped lists and PDF so we never include GEDs from other sources.
 */
export function filterGedsByFolderId(
  items: GedItem[],
  folderId: string | null,
): GedItem[] {
  if (!folderId) return [];
  return items.filter((item) => String(item.idsource) === String(folderId));
}

/**
 * Returns folder GEDs that have an image URL (for display and PDF).
 */
export function filterFolderImageGeds(
  items: GedItem[],
  folderId: string | null,
): GedItem[] {
  return filterGedsByFolderId(items, folderId).filter(
    (item) => item.url && isImageUrl(item.url),
  );
}
