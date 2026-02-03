import { useCallback, useEffect, useState } from 'react';
import { getGeds } from '../services/ged.service';
import type { GedItem } from '../types/ged.types';
import { QUALIPHOTO_KIND } from '../constants';

const GED_LIMIT = 500;

export interface UseQualiphotoByFolderResult {
  items: GedItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches qualiphoto GEDs for a given folder (idsource = folderId).
 * When folderId is null, does not fetch and returns empty list.
 */
export function useQualiphotoByFolder(
  folderId: string | null,
): UseQualiphotoByFolderResult {
  const [items, setItems] = useState<GedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGeds = useCallback(async () => {
    if (!folderId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getGeds({
        kind: QUALIPHOTO_KIND,
        idsource: folderId,
        limit: GED_LIMIT,
      });
      setItems(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load folder GEDs',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    if (!folderId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGeds({
      kind: QUALIPHOTO_KIND,
      idsource: folderId,
      limit: GED_LIMIT,
    })
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load folder GEDs',
          );
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  return { items, loading, error, refetch: fetchGeds };
}
