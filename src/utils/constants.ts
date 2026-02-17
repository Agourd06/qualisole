/**
 * Central place for all API and app URLs.
 * API base URL is set in .env (VITE_API_BASE_URL); fallback below for when .env is missing.
 */

/** API base URL (with /api). From .env or VITE_API_BASE_URL; fallback: stage backend. */
export const API_BASE_URL: string =
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

/** Shown top-center on every GED/photo and in PDF/Word exports. */
export const POWERED_BY = 'MUNTADAACOM';
