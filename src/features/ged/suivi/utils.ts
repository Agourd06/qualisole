import type { GedItem } from '../types/ged.types';
import type { GedParalleleItem } from '../types/gedParallele.types';
import type { GedMovePayload } from '../services/ged.service';
import { UPLOADS_BASE } from '../../../utils/constants';

/** Build a minimal GedItem from a gedparallel row and slot for the detail modal (title/description edit). */
export function rowSlotToGedItem(
  row: GedParalleleItem,
  slot: 1 | 2,
  folderId: string | null,
): GedItem | null {
  const id = slot === 1 ? row.idsource1 : row.idsource2;
  if (!id) return null;
  const idsource = slot === 2 ? row.id : (folderId ?? row.id);
  const title = slot === 1 ? (row.title1 ?? '') : (row.title2 ?? '');
  const description = slot === 1 ? row.description1 : row.description2;
  const url = slot === 1 ? (row.url1 ?? '') : (row.url2 ?? '');
  const kind = slot === 1 ? (row.kind1 ?? 'qualiphoto') : (row.kind2 ?? 'qualiphoto');
  return {
    id,
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
