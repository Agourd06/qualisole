import {
  getGedById as getGedByIdApi,
  getGeds as getGedsApi,
  updateGed as updateGedApi,
  updateGedIdsource as updateGedIdsourceApi,
  updateGedChantier as updateGedChantierApi,
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
 * Sets a GED's idsource (e.g. folder id or gedparallel row id).
 * PUT /geds/:id?kind=... with body { idsource }.
 */
export async function setGedIdsource(params: {
  id: string;
  kind: string;
  idsource: string | null;
}): Promise<unknown> {
  return updateGedIdsourceApi(params);
}

/**
 * Moves a GED to a folder by updating its idsource.
 * PUT /geds/:id?kind=... with body { idsource: folderId }.
 */
export async function moveGedToFolder(
  payload: GedMovePayload,
  folderId: string,
): Promise<unknown> {
  return setGedIdsource({
    id: payload.id,
    kind: payload.kind,
    idsource: folderId,
  });
}

/** Empty GUID sent to backend to unassign (move to "all GEDs"). */
const IDSOURCE_UNASSIGN = '00000000-0000-0000-0000-000000000000';

/**
 * Moves a GED out of a folder back to the main list (idsource = empty GUID).
 * PUT /geds/:id?kind=... with body { idsource: '00000000-0000-0000-0000-000000000000' }.
 */
export async function moveGedToMain(payload: Pick<GedMovePayload, 'id' | 'kind'>): Promise<unknown> {
  return setGedIdsource({
    id: payload.id,
    kind: payload.kind,
    idsource: IDSOURCE_UNASSIGN,
  });
}

/**
 * Assigns a GED to a chantier (project): sets chantier name and chantierId on the GED.
 * PUT /geds/:id?kind=... with body { chantier_id, chantier }.
 */
export async function setGedChantier(params: {
  id: string;
  kind: string;
  chantierId: string;
  chantier: string;
}): Promise<unknown> {
  return updateGedChantierApi(params);
}
