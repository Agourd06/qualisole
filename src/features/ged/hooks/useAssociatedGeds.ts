import { useCallback, useEffect, useState } from 'react';
import { getGeds } from '../services/ged.service';
import type { GedItem } from '../types/ged.types';

const ASSOCIATED_LIMIT = 100;

export interface UseAssociatedGedsResult {
  items: GedItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches GEDs whose idsource equals the given gedId (GEDs "associated" to this one).
 * Used in the detail modal to show voice notes, attachments, etc. linked to the selected GED.
 * When gedId or kind is null/empty, does not fetch and returns empty list.
 */
export function useAssociatedGeds(
  gedId: string | null,
  kind: string,
): UseAssociatedGedsResult {
  const [items, setItems] = useState<GedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGeds = useCallback(async () => {
    if (!gedId || !kind) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    const requestedGedId = gedId;
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const list = await getGeds({
        kind,
        idsource: requestedGedId,
        limit: ASSOCIATED_LIMIT,
      });
      const requestedNorm = String(requestedGedId).toLowerCase().trim();
      const associatedOnly = list.filter((item) => {
        const source = item.idsource;
        if (source == null || source === '') return false;
        return String(source).toLowerCase().trim() === requestedNorm;
      });
      setItems(associatedOnly);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load associated GEDs',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [gedId, kind]);

  useEffect(() => {
    fetchGeds();
  }, [fetchGeds]);

  return { items, loading, error, refetch: fetchGeds };
}
