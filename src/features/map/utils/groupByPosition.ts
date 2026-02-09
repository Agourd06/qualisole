/**
 * Groups GEDs by rounded coordinates so that items at the same position
 * are treated as one location (one marker on the map).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Precision for grouping: 6 decimals ≈ 0.1 m. */
const COORD_PRECISION = 6;

export function positionKey(coords: LatLng): string {
  return `${coords.lat.toFixed(COORD_PRECISION)},${coords.lng.toFixed(COORD_PRECISION)}`;
}

export interface LocationGroup<T> {
  positionKey: string;
  coords: LatLng;
  items: T[];
}

/**
 * Groups items by position. Items with the same rounded lat/lng end up in one group.
 */
export function groupByPosition<T>(
  entries: Array<{ item: T; coords: LatLng }>,
): LocationGroup<T>[] {
  const byKey = new Map<string, { coords: LatLng; items: T[] }>();

  for (const { item, coords } of entries) {
    const key = positionKey(coords);
    const existing = byKey.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      byKey.set(key, { coords, items: [item] });
    }
  }

  return Array.from(byKey.entries()).map(([positionKey, { coords, items }]) => ({
    positionKey,
    coords,
    items,
  }));
}
