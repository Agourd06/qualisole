import { useCallback, useEffect, useState } from 'react';
import { getGedParalleleByFolder } from '../services/gedParallele.service';
import type { GedParalleleItem } from '../types/gedParallele.types';

export interface UseGedParalleleByFolderResult {
  items: GedParalleleItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches parallel GED pairs for a given folder (GET /gedparallele/:folderId).
 * When folderId is null, does not fetch and returns empty list.
 */
export function useGedParalleleByFolder(
  folderId: string | null,
): UseGedParalleleByFolderResult {
  const [items, setItems] = useState<GedParalleleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!folderId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getGedParalleleByFolder(folderId);
      setItems(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load parallel GEDs',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading, error, refetch: fetchData };
}

