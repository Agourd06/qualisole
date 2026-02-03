import { useCallback, useEffect, useState } from 'react';
import { getFolders } from '../api/folders.api';
import type { Folder } from '../types/folders.types';

export interface UseFoldersResult {
  /** All folders from API (unfiltered). */
  folders: Folder[];
  /** Folders filtered by projectId (use when a chantier is selected). */
  foldersByProject: (projectId: string) => Folder[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches all folders once on mount. Filtering by project_id is done client-side
 * via foldersByProject(projectId).
 */
export function useFolders(): UseFoldersResult {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getFolders();
      setFolders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const foldersByProject = useCallback(
    (projectId: string): Folder[] =>
      folders.filter((f) => f.project_id === projectId),
    [folders],
  );

  return { folders, foldersByProject, loading, error, refetch: fetchFolders };
}
