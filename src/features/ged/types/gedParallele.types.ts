export interface GedParalleleItem {
  id: string;
  /** Actual GED id for slot 1 (unique). Use this for API calls (PUT /geds/:id), NOT idsource1. */
  id1?: string | null;
  /** Actual GED id for slot 2 (unique). Use this for API calls (PUT /geds/:id), NOT idsource2. */
  id2?: string | null;
  /** Source reference for slot 1 (folder/row id) – NOT unique per GED. Used to update GED's relation. */
  idsource1: string;
  title1: string | null;
  description1: string | null;
  url1: string | null;
  latitude1: string | null;
  longitude1: string | null;
  kind1: string | null;
  /** Source reference for slot 2 (folder/row id) – NOT unique per GED. Used to update GED's relation. */
  idsource2: string | null;
  title2: string | null;
  description2: string | null;
  url2: string | null;
  latitude2: string | null;
  longitude2: string | null;
  kind2: string | null;
  created_at: string;
  updated_at: string;
}

export type GedParalleleListResponse = GedParalleleItem[];

/** Payload to set a parallel row slot from a GED (drag from left panel). */
export interface GedParalleleSlotPayload {
  title: string;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  kind: string;
  url: string;
  /** GED id; for slot 2, backend may set idsource2 to the row id. */
  idsource?: string;
}

