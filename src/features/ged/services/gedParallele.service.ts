import {
  getGedParalleleByFolder as getGedParalleleByFolderApi,
  updateGedParalleleSlot as updateGedParalleleSlotApi,
} from '../../../api/gedParallele.api';
import type {
  GedParalleleListResponse,
  GedParalleleItem,
  GedParalleleSlotPayload,
} from '../types/gedParallele.types';

export const getGedParalleleByFolder = (
  folderId: string,
): Promise<GedParalleleListResponse> => getGedParalleleByFolderApi(folderId);

/**
 * Update a parallel row slot with GED data, or clear it.
 * For slot 2, idsource2 is set to rowId on the backend (or send in payload).
 */
export const updateGedParalleleSlot = (
  rowId: string,
  slot: 1 | 2,
  options: { clear: true } | { clear?: false; payload: GedParalleleSlotPayload },
): Promise<GedParalleleItem> => {
  if (!options.clear && options.payload) {
    const payload: GedParalleleSlotPayload = { ...options.payload };
    if (slot === 2) payload.idsource = rowId;
    return updateGedParalleleSlotApi(rowId, slot, { payload });
  }
  return updateGedParalleleSlotApi(rowId, slot, options);
};

