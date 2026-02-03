/** Single folder from GET /folders */
export interface Folder {
  id: string;
  code: string;
  title: string;
  description: string | null;
  conclusion: string | null;
  project_id: string;
  zone_id: string | null;
  owner_id: string;
  control_id: string;
  technicien_id: string;
  foldertype_id: string | null;
  foldertype: string;
  status_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  foldertypes: unknown;
}

export type FolderListResponse = Folder[];
