import {
  createGed as createGedApi,
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
import { QUALIPHOTO_KIND, QUALIPHOTO_DEFAULT_STATUS_ID } from '../constants';
import type { GeoPosition } from '../hooks/useGeolocation';

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

export interface CreateGedFormInput {
  /** From connected user. */
  author: string;
  idauthor: string;
  company_id: string;
  /** From geolocation when available; when null, empty strings are sent for position fields. */
  position: GeoPosition | null;
  /** Folder id or empty GUID for unassigned. */
  idsource: string;
  chantier: string;
  title: string;
  description: string;
  imageFile: File;
  voiceFile?: File | null;
}

/**
 * Builds FormData for POST /geds?kind=qualiphoto&idsource=...
 * Auto-fields: author, idauthor, company_id, status_id, latitude, longitude, altitude, accuracy, altitudeAccuracy, kind, position, mode.
 * User-facing fields: title, description, chantier. Files: file (image), voice (optional).
 */
const EMPTY_POSITION: GeoPosition = {
  latitude: '',
  longitude: '',
  altitude: '',
  accuracy: '',
  altitudeAccuracy: '',
};

export function buildCreateGedFormData(input: CreateGedFormInput): FormData {
  const pos = input.position ?? EMPTY_POSITION;
  const fd = new FormData();
  fd.append('kind', QUALIPHOTO_KIND);
  fd.append('idsource', input.idsource);
  fd.append('author', input.author);
  fd.append('idauthor', input.idauthor);
  fd.append('company_id', input.company_id);
  fd.append('status_id', QUALIPHOTO_DEFAULT_STATUS_ID);
  fd.append('latitude', pos.latitude);
  fd.append('longitude', pos.longitude);
  fd.append('altitude', pos.altitude);
  fd.append('accuracy', pos.accuracy);
  fd.append('altitudeAccuracy', pos.altitudeAccuracy);
  fd.append('position', '0');
  fd.append('chantier', input.chantier);
  fd.append('title', input.title);
  fd.append('description', input.description);
  fd.append('mode', 'capture');
  fd.append('file', input.imageFile);
  if (input.voiceFile) {
    fd.append('voice', input.voiceFile);
  }
  return fd;
}

/**
 * Creates a new qualiphoto GED via POST /geds?kind=qualiphoto&idsource=...
 * Returns the created GED. Caller must build FormData (e.g. via buildCreateGedFormData).
 */
export async function createGed(idsource: string, formData: FormData): Promise<GedItem> {
  return createGedApi({ kind: QUALIPHOTO_KIND, idsource, formData });
}
