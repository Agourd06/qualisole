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
