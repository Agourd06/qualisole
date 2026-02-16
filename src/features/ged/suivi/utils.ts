import type { GedItem } from '../types/ged.types';
import type { GedParalleleItem } from '../types/gedParallele.types';
import type { GedMovePayload } from '../services/ged.service';
import { getGeds } from '../services/ged.service';
import { QUALIPHOTO_KIND } from '../constants';
import { UPLOADS_BASE } from '../../../utils/constants';

/**
 * Build a minimal GedItem from a gedparallel row and slot for the detail modal (title/description edit).
 * IMPORTANT: Use the real GED id (id1/id2), NOT idsource1/idsource2. idsource identifies the
 * source relation (folder/row); the GED's unique id is required for API calls (PUT /geds/:id).
 */
export function rowSlotToGedItem(
  row: GedParalleleItem,
  slot: 1 | 2,
  folderId: string | null,
): GedItem | null {
  const gedId = slot === 1 ? row.id1 : row.id2;
  if (!gedId) return null;
  const idsource = slot === 2 ? row.id : (folderId ?? row.id);
  const title = slot === 1 ? (row.title1 ?? '') : (row.title2 ?? '');
  const description = slot === 1 ? row.description1 : row.description2;
  const url = slot === 1 ? (row.url1 ?? '') : (row.url2 ?? '');
  const kind = slot === 1 ? (row.kind1 ?? 'qualiphoto') : (row.kind2 ?? 'qualiphoto');
  return {
    id: gedId,
    idsource: String(idsource),
    title,
    kind,
    description: description ?? null,
    url,
    author: null,
    position: 0,
    latitude: null,
    longitude: null,
    size: 0,
    status_id: null,
    company_id: null,
    level: null,
    type: null,
    categorie: null,
    chantier: null,
    assigned: null,
    audiotxt: null,
    iatxt: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Include index so duplicate row ids from API still get unique droppable/draggable ids. */
export function slotDroppableId(rowId: string, slot: 1 | 2, index: number): string {
  return `slot-${rowId}-${slot}-${index}`;
}

export function parseSlotDroppableId(id: string): { rowId: string; slot: 1 | 2 } | null {
  if (!id.startsWith('slot-')) return null;
  const parts = id.split('-');
  if (parts.length === 3)
    return { rowId: parts[1], slot: Number(parts[2]) as 1 | 2 };
  if (parts.length >= 4)
    return {
      rowId: parts.slice(1, -2).join('-'),
      slot: Number(parts[parts.length - 2]) as 1 | 2,
    };
  return null;
}

/** Droppable id for "add to folder" – always visible so user can add GED to folder directly. */
export function folderDropId(folderId: string): string {
  return `suivi-folder-${folderId}`;
}

export function parseFolderDropId(id: string): string | null {
  const prefix = 'suivi-folder-';
  return id.startsWith(prefix) ? id.slice(prefix.length) : null;
}

/** Same as Constat: payload for moveGedToFolder (PUT geds idsource). */
export function toMovePayload(ged: GedItem): GedMovePayload {
  return {
    id: ged.id,
    kind: ged.kind,
    title: ged.title,
    description: ged.description ?? null,
  };
}

export function buildMediaUrl(urlPath: string | null): string | null {
  if (!urlPath) return null;
  const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return `${UPLOADS_BASE.replace(/\/$/, '')}${path}`;
}

/** Normalize URL for comparison (strip leading slash). */
function normalizeUrl(url: string | null): string {
  if (!url) return '';
  return url.startsWith('/') ? url.slice(1) : url;
}

/**
 * Resolves the real GedItem for a slot when opening the detail modal.
 * Uses id1/id2 from the row when available; otherwise fetches GEDs by idsource and matches by url/title.
 * This ensures we always have the correct GED id for API calls (PUT /geds/:id).
 *
 * IMPORTANT: When we fetch a GED, we overlay the gedparallele row's title/description for display.
 * The gedparallele table stores the slot data (title1/2, description1/2) that the user sees in the
 * Suivi cards. The geds table is a different source. We must show the row data in the modal so it
 * matches what the user sees (e.g. description2="Jbbhh" from gedparallele, not "heloo there" from geds).
 */
export async function resolveGedForSlot(
  row: GedParalleleItem,
  slot: 1 | 2,
  folderId: string | null,
): Promise<GedItem | null> {
  const gedId = slot === 1 ? row.id1 : row.id2;
  if (gedId) {
    return rowSlotToGedItem(row, slot, folderId);
  }
  const idsource = slot === 1 ? row.idsource1 : row.idsource2;
  if (!idsource) return null;

  const rowKind = slot === 1 ? row.kind1 : row.kind2;
  const kind = rowKind ?? QUALIPHOTO_KIND;

  let geds = await getGeds({
    kind,
    idsource: String(idsource),
    limit: 50,
  });
  let ged = findGedInSlot(geds, row, slot);
  if (!ged && kind !== QUALIPHOTO_KIND) {
    geds = await getGeds({
      kind: QUALIPHOTO_KIND,
      idsource: String(idsource),
      limit: 50,
    });
    ged = findGedInSlot(geds, row, slot);
  }
  if (!ged && folderId && String(idsource) === String(folderId)) {
    geds = await getGeds({
      kind,
      idsource: folderId,
      limit: 100,
    });
    ged = findGedInSlot(geds, row, slot);
  }
  if (!ged && slot === 1) {
    geds = await getGeds({
      kind,
      idsource: row.id,
      limit: 50,
    });
    ged = findGedInSlot(geds, row, slot);
  }

  if (!ged) return null;

  const rowTitle = slot === 1 ? row.title1 : row.title2;
  const rowDescription = slot === 1 ? row.description1 : row.description2;
  return {
    ...ged,
    title: rowTitle ?? ged.title,
    description: rowDescription ?? ged.description,
  };
}

/**
 * Find the GED in the list that matches the row slot.
 * IMPORTANT: When the row has a URL, we match ONLY by URL – never by title.
 * Multiple GEDs can share the same title; matching by title alone returns the wrong GED.
 * Title fallback is only used when the row has no URL.
 */
export function findGedInSlot(
  geds: GedItem[],
  row: GedParalleleItem,
  slot: 1 | 2,
): GedItem | undefined {
  const url = slot === 1 ? row.url1 : row.url2;
  const title = slot === 1 ? row.title1 : row.title2;
  const normRowUrl = normalizeUrl(url);
  return geds.find((g) => {
    if (normRowUrl) {
      return normalizeUrl(g.url) === normRowUrl;
    }
    if (title != null && title.trim() && g.title?.trim() === title.trim()) return true;
    return false;
  });
}
