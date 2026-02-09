import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type L from 'leaflet';
import {
  MAP_VIEWPORT_BOUNDS_PAD,
  MAP_BOUNDS_DEBOUNCE_MS,
} from '../constants';

export interface MapBoundsUpdaterProps {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  /** Override padding ratio (default from constants). */
  boundsPad?: number;
  /** Debounce ms: update only after user stops moving (default from constants). */
  debounceMs?: number;
}

/**
 * Subscribes to moveend/zoomend only (never move). Debounces so we run at most
 * once after the user stops panning/zooming. Tile requests in Network tab are
 * from the tile server (OSM) and are cached in production; our logic runs only
 * after movement ends.
 */
export function MapBoundsUpdater({
  onBoundsChange,
  boundsPad = MAP_VIEWPORT_BOUNDS_PAD,
  debounceMs = MAP_BOUNDS_DEBOUNCE_MS,
}: MapBoundsUpdaterProps) {
  const map = useMap();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onBoundsChange);
  callbackRef.current = onBoundsChange;

  useEffect(() => {
    const runUpdate = () => {
      const b = map.getBounds();
      const padded = b.pad ? b.pad(boundsPad) : b;
      callbackRef.current(padded);
    };

    const scheduleUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runUpdate();
      }, debounceMs);
    };

    runUpdate();
    map.on('moveend', scheduleUpdate);
    map.on('zoomend', scheduleUpdate);
    return () => {
      map.off('moveend', scheduleUpdate);
      map.off('zoomend', scheduleUpdate);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map, onBoundsChange, boundsPad, debounceMs]);

  return null;
}
