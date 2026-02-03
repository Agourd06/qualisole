import type { LoginResponse, User } from '../features/auth/types/auth.types';

const TOKEN_KEY = 'qualsol_token';
const USER_KEY = 'qualsol_user';

export interface StoredAuth {
  token: string | null;
  user: User | null;
}

export const saveAuth = (data: LoginResponse): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, data.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
};

export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
};

export const getStoredAuth = (): StoredAuth => {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(rawUser) as User;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

