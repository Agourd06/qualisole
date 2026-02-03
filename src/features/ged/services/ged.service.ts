import {
  getGedById as getGedByIdApi,
  getGeds as getGedsApi,
  updateGed as updateGedApi,
  updateGedIdsource as updateGedIdsourceApi,
} from '../../../api/geds.api';
import type {
  GedByIdResponse,
  GedListResponse,
  GetGedByIdParams,
} from '../types/ged.types';
import type { GedItem } from '../types/ged.types';

/** Minimal payload for moving a GED to a folder (drag-and-drop). */
export type GedMovePayload = Pick<GedItem, 'id' | 'kind' | 'title' | 'description'>;

export type { GetGedsParams, UpdateGedParams } from '../../../api/geds.api';

export const getGedById = (params: GetGedByIdParams): Promise<GedByIdResponse> =>
  getGedByIdApi(params);

export const getGeds = (params: Parameters<typeof getGedsApi>[0]): Promise<GedListResponse> =>
  getGedsApi(params);

export const updateGed = (params: Parameters<typeof updateGedApi>[0]): Promise<unknown> =>
  updateGedApi(params);

/**
 * Moves a GED to a folder by updating its idsource.
 * PUT /geds/:id?kind=... with body { idsource: folderId }.
 */
export async function moveGedToFolder(
  payload: GedMovePayload,
  folderId: string,
): Promise<unknown> {
  return updateGedIdsourceApi({
    id: payload.id,
    kind: payload.kind,
    idsource: folderId,
  });
}
