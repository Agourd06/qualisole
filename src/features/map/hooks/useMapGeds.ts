import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGeds } from '../../ged/services/ged.service';
import {
  QUALIPHOTO_KIND,
  IDSOURCE_MAIN,
  IDSOURCE_EMPTY_GUID,
} from '../../ged/constants';
import type { GedItem } from '../../ged/types/ged.types';
import { groupByPosition, type LatLng, type LocationGroup } from '../utils/groupByPosition';

const GED_LIMIT = 2000;

function parseLatLng(ged: GedItem): LatLng | null {
  if (!ged.latitude || !ged.longitude) return null;
  const lat = Number(ged.latitude);
  const lng = Number(ged.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export interface MapGedsState {
  loading: boolean;
  error: string | null;
  groups: LocationGroup<GedItem>[];
  mapCenter: LatLng;
  refetch: () => Promise<GedItem[]>;
}

const DEFAULT_CENTER: LatLng = { lat: 31.8, lng: -7.1 };

export function useMapGeds(): MapGedsState {
  const [items, setItems] = useState<GedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (): Promise<GedItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const [list0, listGuid] = await Promise.all([
        getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_MAIN, limit: GED_LIMIT }),
        getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_EMPTY_GUID, limit: GED_LIMIT }),
      ]);
      const byId = new Map<string, GedItem>();
      for (const item of [...list0, ...listGuid]) byId.set(item.id, item);
      const next = Array.from(byId.values());
      setItems(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LOAD_ERROR');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAll().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  const refetch = useCallback(async (): Promise<GedItem[]> => fetchAll(), [fetchAll]);

  const geoEntries = useMemo(
    () =>
      items
        .map((ged) => {
          const coords = parseLatLng(ged);
          if (!coords) return null;
          return { item: ged, coords };
        })
        .filter((e): e is { item: GedItem; coords: LatLng } => e !== null),
    [items],
  );

  const groups = useMemo(
    () => groupByPosition(geoEntries),
    [geoEntries],
  );

  const mapCenter = useMemo((): LatLng => {
    if (groups.length === 0) return DEFAULT_CENTER;
    const sum = groups.reduce(
      (acc, g) => {
        acc.lat += g.coords.lat;
        acc.lng += g.coords.lng;
        return acc;
      },
      { lat: 0, lng: 0 },
    );
    return {
      lat: sum.lat / groups.length,
      lng: sum.lng / groups.length,
    };
  }, [groups]);

  return {
    loading,
    error,
    groups,
    mapCenter,
    refetch,
  };
}
