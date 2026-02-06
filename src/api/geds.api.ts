import axiosClient from './axiosClient';
import type {
  GedByIdResponse,
  GedListResponse,
  GetGedByIdParams,
} from '../features/ged/types/ged.types';

const BASE_URL = '/geds';

/**
 * GET /geds/getGedById?kind=...&idsource=...
 */
export const getGedById = async (
  params: GetGedByIdParams,
): Promise<GedByIdResponse> => {
  const { data } = await axiosClient.get<GedByIdResponse>(
    `${BASE_URL}/getGedById`,
    { params: { kind: params.kind, idsource: params.idsource } },
  );
  return data;
};

export interface GetGedsParams {
  kind: string;
  idsource: string | number;
  /** Optional: request more items if the backend supports pagination/limit (default may be 3 or 10). */
  limit?: number;
  /** Optional: filter GEDs by chantier (project) id. When set, backend may return GEDs for this chantier. */
  chantierId?: string;
}

/**
 * GET /geds?kind=qualiphoto&idsource=0&limit=500
 * Optional: &chantier_id=xxx to filter by chantier.
 */
export const getGeds = async (params: GetGedsParams): Promise<GedListResponse> => {
  const requestParams: Record<string, string | number> = {
    kind: params.kind,
    idsource: params.idsource,
  };
  if (params.limit != null) requestParams.limit = params.limit;
  if (params.chantierId != null && params.chantierId !== '') requestParams.chantier_id = params.chantierId;
  const { data } = await axiosClient.get<GedListResponse>(BASE_URL, {
    params: requestParams,
  });
  return Array.isArray(data) ? data : [];
};

export interface UpdateGedParams {
  id: string;
  kind: string;
  idsource: string | number;
  title?: string;
  description?: string | null;
}

/**
 * PUT /geds/:id?kind=... – update a GED (title/description in body).
 * Only sends body fields that are filled (not null/empty).
 */
export const updateGed = async (params: UpdateGedParams): Promise<unknown> => {
  const body: Record<string, string> = {};
  if (params.title != null && params.title.trim() !== '') body.title = params.title.trim();
  if (params.description != null && params.description.trim() !== '') body.description = params.description.trim();
  const { data } = await axiosClient.put<unknown>(
    `${BASE_URL}/${params.id}`,
    body,
    { params: { kind: params.kind } },
  );
  return data;
};

export interface UpdateGedIdsourceParams {
  id: string;
  kind: string;
  /** Folder id to assign, or null to unassign (move to "all GEDs"). */
  idsource: string | null;
}

/**
 * PUT /geds/:id?kind=qualiphoto&idsource=... – update GED idsource (folder id or gedparallel row id).
 * Sends kind and idsource as query params to match backend.
 */
export const updateGedIdsource = async (
  params: UpdateGedIdsourceParams,
): Promise<unknown> => {
  const { data } = await axiosClient.put<unknown>(
    `${BASE_URL}/${params.id}`,
    { idsource: params.idsource },
    {
      params: {
        kind: params.kind,
        idsource: params.idsource ?? '',
      },
    },
  );
  return data;
};

export interface UpdateGedChantierParams {
  id: string;
  kind: string;
  chantierId: string;
  chantier: string;
}

/**
 * PUT /geds/:id?kind=... – update GED chantier and chantierId (assign GED to a chantier).
 * Body: chantier_id (backend snake_case) and chantier (name).
 */
export const updateGedChantier = async (
  params: UpdateGedChantierParams,
): Promise<unknown> => {
  const { data } = await axiosClient.put<unknown>(
    `${BASE_URL}/${params.id}`,
    { chantier_id: params.chantierId, chantier: params.chantier },
    { params: { kind: params.kind } },
  );
  return data;
};
