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
  /** View count; incremented when user opens the GED detail modal. */
  vue?: number;
  /** false/0 = green stars, true/1 = yellow stars (IA analysis status). */
  iaanalyse?: number | boolean;
  /** 0 = green map pin, 1 = orange map pin (visibility). */
  visible?: number;
  /** upload | capture | Video | Frame – determines top-right icon. */
  mode?: string | null;
  /** Powered-by label (e.g. MUNTADAACOM), shown with icon in top middle. */
  poweredby?: string | null;
  /** Voice note URL (e.g. /uploads/.../voicenote.m4a). Null when no voice note. */
  urlvoice?: string | null;
}

export type GedListResponse = GedItem[];
