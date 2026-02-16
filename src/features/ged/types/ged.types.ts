/**
 * GED API types.
 */
export interface GetGedByIdParams {
  kind: string;
  idsource: string | number;
}

export type GedByIdResponse = unknown;

/** Single GED item from /geds?kind=qualiphoto&idsource=0 */
export interface GedItem {
  id: string;
  idsource: string;
  title: string;
  kind: string;
  description: string | null;
  author: string | null;
  /** Author user id (for filtering by author). */
  idauthor?: string | null;
  position: number;
  latitude: string | null;
  longitude: string | null;
  url: string;
  size: number;
  status_id: string | null;
  company_id: string | null;
  level: number | null;
  type: string | null;
  categorie: string | null;
  chantier: string | null;
  assigned: string | null;
  audiotxt: string | null;
  iatxt: string | null;
  created_at: string;
  updated_at: string;
}

export type GedListResponse = GedItem[];
