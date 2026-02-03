import axiosClient from './axiosClient';
import type { ProjetListResponse } from '../types/projets.types';

const BASE = '/projets';

/**
 * GET /projets – list all projects (chantiers).
 */
export async function getProjets(): Promise<ProjetListResponse> {
  const { data } = await axiosClient.get<ProjetListResponse>(BASE);
  return Array.isArray(data) ? data : [];
}
