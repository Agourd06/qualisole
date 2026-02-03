import { useCallback, useEffect, useState } from 'react';
import { getProjets } from '../api/projets.api';
import type { Projet } from '../types/projets.types';

export interface UseProjetsResult {
  projets: Projet[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches projects (chantiers) once on mount. Exposes list, loading, error and refetch.
 */
export function useProjets(): UseProjetsResult {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getProjets();
      setProjets(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjets();
  }, [fetchProjets]);

  return { projets, loading, error, refetch: fetchProjets };
}
