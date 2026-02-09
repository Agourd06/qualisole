import L from 'leaflet';
import { MAP_MARKER_SIZE_PX } from '../constants';

/**
 * Creates a Leaflet DivIcon that uses the GED thumbnail as the marker image.
 * When count > 1, shows a small badge so the user knows multiple GEDs are at this location.
 * Uses contain:layout paint for cheaper repaints during pan.
 */
export function createGedMarkerIcon(
  imageUrl: string,
  count: number,
  sizePx: number = MAP_MARKER_SIZE_PX,
): L.DivIcon {
  const anchorX = sizePx / 2;
  const anchorY = sizePx;

  const badge =
    count > 1
      ? `<span style="position:absolute;bottom:-2px;right:-2px;min-width:16px;height:16px;padding:0 3px;border-radius:8px;background:#1e40af;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${count}</span>`
      : '';

  const escapedUrl = imageUrl.replace(/"/g, '&quot;');

  return L.divIcon({
    html: `<div style="position:relative;width:${sizePx}px;height:${sizePx}px;border-radius:6px;overflow:hidden;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);contain:layout paint;"><img src="${escapedUrl}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;" />${badge}</div>`,
    className: 'map-ged-div-icon',
    iconSize: [sizePx, sizePx],
    iconAnchor: [anchorX, anchorY],
  });
}
