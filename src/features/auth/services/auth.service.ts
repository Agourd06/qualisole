import { loginRequest } from '../../../api/auth.api';
import { saveAuth } from '../../../utils/authStorage';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const loginResponse = await loginRequest(credentials);
  saveAuth(loginResponse);
  return loginResponse;
};
