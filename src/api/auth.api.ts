import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import type { LoginCredentials, LoginResponse } from '../features/auth/types/auth.types';

const HEALTH_PATH = '/health';
const LOGIN_PATH = '/users/login';

interface HealthResponse {
  token: string;
}

/**
 * Get token from health endpoint (used to authenticate the login request).
 */
export const getHealthToken = async (): Promise<string> => {
  const { data } = await axios.get<HealthResponse>(API_BASE_URL + HEALTH_PATH);
  return data.token;
};

/**
 * Login: uses health token then POST /users/login. Returns user + token (caller must save auth).
 */
export const loginRequest = async (
  credentials: LoginCredentials,
): Promise<LoginResponse> => {
  const healthToken = await getHealthToken();
  const { data } = await axios.post<LoginResponse>(API_BASE_URL + LOGIN_PATH, credentials, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${healthToken}`,
    },
  });
  return data;
};
