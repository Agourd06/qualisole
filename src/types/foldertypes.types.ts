/** Single folder type from GET /foldertypes */
export interface FolderType {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  libelle?: string;
  [key: string]: unknown;
}

export type FolderTypeListResponse = FolderType[];
