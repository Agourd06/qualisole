/** GED kind for qualiphoto list. */
export const QUALIPHOTO_KIND = 'qualiphoto';

/** Default idsource when listing qualiphoto without a folder (main list). */
export const IDSOURCE_MAIN = 0;

/** Empty GUID used by backend for unassigned GEDs (same meaning as null). */
export const IDSOURCE_EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** True if idsource means unassigned (main list): null, '0', '', or empty GUID. */
export function isUnassignedIdsource(idsource: string | number | null | undefined): boolean {
  if (idsource == null || idsource === '') return true;
  const s = String(idsource).toLowerCase();
  return s === '0' || s === IDSOURCE_EMPTY_GUID;
}

/** Number of items per page in qualiphoto galleries. */
export const QUALIPHOTO_ITEMS_PER_PAGE = 10;

/** MIME type for drag-and-drop GED payload (left → right). */
export const GED_DRAG_MIME = 'application/x-qualisol-ged';
