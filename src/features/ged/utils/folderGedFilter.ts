import type { GedItem } from '../types/ged.types';
import { isMediaUrl } from './qualiphotoHelpers';

/**
 * Applies a saved order to a list of items. Items in orderedIds appear in that order;
 * any items not in orderedIds are appended at the end (e.g. newly added to folder).
 */
export function applyOrderToItems<T extends { id: string }>(
  items: T[],
  orderedIds: string[] | null,
): T[] {
  if (!items.length) return items;
  if (!orderedIds || orderedIds.length === 0) return items;

  const byId = new Map(items.map((i) => [i.id, i]));
  const result: T[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const item = byId.get(id);
    if (item) {
      result.push(item);
      seen.add(id);
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) result.push(item);
  }
  return result;
}

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
    (item) => item.url && isMediaUrl(item.url),
  );
}
