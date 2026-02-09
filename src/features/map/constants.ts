/**
 * Map feature tuning. Adjust these for performance vs. completeness.
 *
 * Note: Network tab will show many tile requests on pan/zoom – that’s Leaflet/OSM
 * loading map tiles. Those are cached by the browser (disable cache in DevTools
 * makes it look worse). We only run our own logic on moveend/zoomend, debounced.
 *
 * - BOUNDS_PAD: viewport padding for marker culling; larger = fewer pop-in at edges.
 * - BOUNDS_DEBOUNCE_MS: wait this long after user stops moving before updating markers.
 * - MAX_VISIBLE_MARKERS: cap rendered markers (0 = no cap).
 * - MARKER_SIZE_PX: smaller = less paint cost.
 */
export const MAP_VIEWPORT_BOUNDS_PAD = 0.2;
/** Debounce: only update marker list after user stops pan/zoom for this long. */
export const MAP_BOUNDS_DEBOUNCE_MS = 280;
export const MAP_MAX_VISIBLE_MARKERS = 80;
export const MAP_MARKER_SIZE_PX = 44;
