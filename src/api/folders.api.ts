import axiosClient from './axiosClient';
import type { FolderListResponse } from '../types/folders.types';

const BASE = '/folders';

/**
 * GET /folders – list all folders.
 */
export async function getFolders(): Promise<FolderListResponse> {
  const { data } = await axiosClient.get<FolderListResponse>(BASE);
  return Array.isArray(data) ? data : [];
}

export interface UpdateFolderParams {
  id: string;
  title?: string;
  description?: string | null;
  conclusion?: string | null;
}

/**
 * PUT /folders/:id – update folder metadata (title/description/conclusion).
 * Only sends body fields that are non-empty so we never send null.
 */
export async function updateFolder(params: UpdateFolderParams): Promise<unknown> {
  const body: Record<string, string> = {};

  if (params.title != null && params.title.trim() !== '') {
    body.title = params.title.trim();
  }
  if (params.description != null && params.description.trim() !== '') {
    body.description = params.description.trim();
  }
  if (params.conclusion != null && params.conclusion.trim() !== '') {
    body.conclusion = params.conclusion.trim();
  }

  const { data } = await axiosClient.put<unknown>(`${BASE}/${params.id}`, body);
  return data;
}

const FOLDER_IMAGE_ORDER_KEY = 'folder_image_order';

/**
 * GET /folders/:id/image-order – returns ordered GED ids for PDF/list order.
 * Backend may return { orderedIds: string[] }. If endpoint does not exist, returns null (caller can use fallback).
 */
export async function getFolderImageOrder(
  folderId: string,
): Promise<string[] | null> {
  try {
    const { data } = await axiosClient.get<{ orderedIds?: string[] }>(
      `${BASE}/${folderId}/image-order`,
    );
    const ids = data?.orderedIds;
    return Array.isArray(ids) ? ids : null;
  } catch {
    return null;
  }
}

/**
 * PUT /folders/:id/image-order – persist ordered GED ids for this folder.
 * Body: { orderedIds: string[] }. If backend fails, returns false so caller can use fallback.
 */
export async function updateFolderImageOrder(
  folderId: string,
  orderedIds: string[],
): Promise<boolean> {
  try {
    await axiosClient.put<unknown>(`${BASE}/${folderId}/image-order`, {
      orderedIds,
    });
    return true;
  } catch {
    return false;
  }
}

/** Local storage fallback key for folder image order (when API is not available). */
export function getFolderImageOrderStorageKey(folderId: string): string {
  return `${FOLDER_IMAGE_ORDER_KEY}_${folderId}`;
}

/** Read order from localStorage (fallback). */
export function getFolderImageOrderFromStorage(
  folderId: string,
): string[] | null {
  try {
    const raw = window.localStorage.getItem(
      getFolderImageOrderStorageKey(folderId),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Write order to localStorage (fallback when API fails). */
export function setFolderImageOrderInStorage(
  folderId: string,
  orderedIds: string[],
): void {
  try {
    window.localStorage.setItem(
      getFolderImageOrderStorageKey(folderId),
      JSON.stringify(orderedIds),
    );
  } catch {
    // ignore
  }
}
