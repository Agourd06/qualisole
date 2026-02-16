import type { GedItem } from '../types/ged.types';
import { isMediaUrl } from './qualiphotoHelpers';

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  if (items.length <= 1) return items;
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * Applies a saved order to a list of items. Items in orderedIds appear in that order;
 * any items not in orderedIds are appended at the end (e.g. newly added to folder).
 */
export function applyOrderToItems<T extends { id: string }>(
  items: T[],
  orderedIds: string[] | null,
): T[] {
  if (!items.length) return items;
  // Always dedupe to avoid duplicate React keys / draggable ids when backend returns duplicates.
  const uniqueItems = dedupeById(items);
  if (!orderedIds || orderedIds.length === 0) return uniqueItems;

  const byId = new Map(uniqueItems.map((i) => [i.id, i]));
  const result: T[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const item = byId.get(id);
    if (item) {
      result.push(item);
      seen.add(id);
    }
  }
  for (const item of uniqueItems) {
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
  return dedupeById(items).filter((item) => String(item.idsource) === String(folderId));
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
