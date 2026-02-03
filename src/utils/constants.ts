/**
 * Central place for all API and app URLs.
 * Single source of truth – change base URLs only here.
 */

/** API base URL (with /api). Default: stage backend. Override via VITE_API_BASE_URL. */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://stage.back.muntadaa.online/api';

/** Base URL for uploaded files (no /api). Used to build full image URLs. */
export const UPLOADS_BASE = (() => {
  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!env) return 'https://stage.back.muntadaa.online';
  const trimmed = env.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
})();

export const APP_NAME = 'QualiSol';
