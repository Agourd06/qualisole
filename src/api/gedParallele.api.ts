import axiosClient from './axiosClient';
import type {
  GedParalleleListResponse,
  GedParalleleItem,
  GedParalleleSlotPayload,
} from '../features/ged/types/gedParallele.types';

const BASE_URL = '/gedparallele';

/**
 * GET /gedparallele/:folderId – returns parallel GED pairs (url1/kind1, url2/kind2, ...).
 */
export const getGedParalleleByFolder = async (
  folderId: string,
): Promise<GedParalleleListResponse> => {
  if (!folderId) return [];
  const { data } = await axiosClient.get<GedParalleleListResponse>(
    `${BASE_URL}/${folderId}`,
  );
  return Array.isArray(data) ? data : [];
};

/**
 * PATCH /gedparallele/:rowId – update or clear one slot (1 or 2).
 * - body.slot: 1 | 2
 * - body.payload: slot data (title, description, latitude, longitude, kind, url; for slot 2, idsource2 = rowId)
 * - body.clear: true to clear the slot (payload ignored)
 */
export const updateGedParalleleSlot = async (
  rowId: string,
  slot: 1 | 2,
  options: { clear: true } | { clear?: false; payload: GedParalleleSlotPayload },
): Promise<GedParalleleItem> => {
  const { data } = await axiosClient.patch<GedParalleleItem>(
    `${BASE_URL}/${rowId}`,
    options.clear ? { slot, clear: true } : { slot, payload: options.payload },
  );
  return data;
};

