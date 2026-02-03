import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { clearAuth, getStoredAuth } from '../utils/authStorage';

const normalizeBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
};

const axiosClient = axios.create({
  baseURL: normalizeBaseUrl(API_BASE_URL),
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const { token } = getStoredAuth();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
