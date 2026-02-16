import axiosClient from './axiosClient';

export interface User {
  id: string;
  [key: string]: unknown;
}

export type UserListResponse = User[];

const BASE = '/users';

/**
 * GET /users – list users (e.g. for author filter).
 */
export async function getUsers(): Promise<UserListResponse> {
  const { data } = await axiosClient.get<UserListResponse>(BASE);
  return Array.isArray(data) ? data : [];
}
