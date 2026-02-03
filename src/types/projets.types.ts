/** Single project (chantier) from GET /projets */
export interface Projet {
  id: string;
  title: string;
  code?: string;
  description?: string | null;
  [key: string]: unknown;
}

export type ProjetListResponse = Projet[];
