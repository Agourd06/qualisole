import axiosClient from './axiosClient';
import type { FolderTypeListResponse } from '../types/foldertypes.types';

const BASE = '/foldertypes';

/**
 * GET /foldertypes – list all folder types.
 */
export async function getFolderTypes(): Promise<FolderTypeListResponse> {
  const { data } = await axiosClient.get<FolderTypeListResponse>(BASE);
  return Array.isArray(data) ? data : [];
}
