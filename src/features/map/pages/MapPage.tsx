import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navbar } from '../../../components/layout/Navbar';
import type { GedItem } from '../../ged/types/ged.types';
import { QualiphotoDetailModal } from '../../ged/components/QualiphotoDetailModal';
import {
  buildImageUrl,
  isVideoUrl,
  isAudioUrl,
} from '../../ged/utils/qualiphotoHelpers';
import { useMapGeds } from '../hooks/useMapGeds';
import { createGedMarkerIcon } from '../utils/gedMarkerIcon';
import { MapLocationPanel } from '../components/MapLocationPanel';
import { MapBoundsUpdater } from '../components/MapBoundsUpdater';
import {
  MAP_MAX_VISIBLE_MARKERS,
  MAP_VIEWPORT_BOUNDS_PAD,
  MAP_BOUNDS_DEBOUNCE_MS,
} from '../constants';
import type { LocationGroup } from '../utils/groupByPosition';

export interface MapPageOptions {
  /** Max markers to render at once (0 = no cap). Default from constants. */
  maxVisibleMarkers?: number;
  /** Bounds padding ratio for viewport culling. Default from constants. */
  boundsPad?: number;
  /** Debounce (ms): update markers only after user stops moving. Default from constants. */
  boundsDebounceMs?: number;
}

/** Single marker per location group; memoizes the custom image icon. */
const MapGroupMarker = React.memo(function MapGroupMarker({
  group,
  onSelectLocationGroup,
  onSelectGed,
}: {
  group: LocationGroup<GedItem>;
  onSelectLocationGroup: (g: LocationGroup<GedItem>) => void;
  onSelectGed: (ged: GedItem) => void;
}) {
  const { t } = useTranslation(['mapPage']);
  const firstGed = group.items[0];
  const imageUrl = buildImageUrl(firstGed);
  const icon = useMemo(
    () => createGedMarkerIcon(imageUrl, group.items.length),
    [imageUrl, group.items.length],
  );
  const isMulti = group.items.length > 1;

  return (
    <Marker
      position={[group.coords.lat, group.coords.lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (isMulti) onSelectLocationGroup(group);
        },
      }}
    >
      <Popup className="map-ged-popup" minWidth={260} maxWidth={320}>
        <div className="space-y-2">
          {isMulti ? (
            <>
              <p className="text-sm font-semibold text-neutral-800">
                {t('mapPage:thisLocationHasMany', { count: group.items.length })}
              </p>
              <p className="text-xs text-neutral-500">
                {t('mapPage:showListOnRight')}
              </p>
              <button
                type="button"
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
                onClick={() => onSelectLocationGroup(group)}
              >
                {t('mapPage:manyGedsAtLocation', { count: group.items.length })}
              </button>
            </>
          ) : (
            <>
              <div className="w-full overflow-hidden rounded-lg bg-neutral-100">
                <PopupMedia
                  ged={firstGed}
                  imageUrl={imageUrl}
                  className="block"
                />
              </div>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelectGed(firstGed)}
              >
                <p className="text-sm font-semibold text-neutral-800 line-clamp-2">
                  {firstGed.title || t('mapPage:noTitle')}
                </p>
                <p className="text-xs text-neutral-500">
                  {firstGed.chantier ?? firstGed.categorie ?? '—'}
                </p>
              </button>
              <p className="text-[0.7rem] text-neutral-400">
                {firstGed.latitude}, {firstGed.longitude}
              </p>
            </>
          )}
        </div>
      </Popup>
    </Marker>
  );
});

// Default pin icon (fallback) – use local assets from /public.
L.Icon.Default.mergeOptions({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
});

/** Popup media: image, video thumbnail, or audio placeholder. */
function PopupMedia({
  ged,
  imageUrl,
  className,
}: {
  ged: GedItem;
  imageUrl: string;
  className?: string;
}) {
  if (!ged.url) return null;
  const isVideo = isVideoUrl(ged.url);
  const isAudio = isAudioUrl(ged.url);

  if (isAudio) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-lg bg-neutral-100 ${className ?? ''}`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Audio
        </span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-lg bg-black ${className ?? ''}`}>
        <video
          src={imageUrl}
          className="h-full w-full object-contain"
          preload="metadata"
          playsInline
          muted
          aria-label={ged.title ?? 'Video'}
        />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={ged.title ?? ''}
      className={`aspect-video w-full rounded-lg object-cover ${className ?? ''}`}
      loading="lazy"
    />
  );
}

export const MapPage: React.FC<{ options?: MapPageOptions }> = ({ options = {} }) => {
  const { t } = useTranslation(['mapPage', 'qualiphotoPage']);
  const { loading, error, groups, mapCenter, refetch } = useMapGeds();

  const maxVisible = options.maxVisibleMarkers ?? MAP_MAX_VISIBLE_MARKERS;
  const boundsPad = options.boundsPad ?? MAP_VIEWPORT_BOUNDS_PAD;
  const boundsDebounceMs = options.boundsDebounceMs ?? MAP_BOUNDS_DEBOUNCE_MS;

  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const deferredBounds = useDeferredValue(bounds);
  const [selectedLocationGroup, setSelectedLocationGroup] = useState<LocationGroup<GedItem> | null>(
    null,
  );
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);

  /** Only render markers inside the viewport (deferred so pan stays smooth). Optional cap for dense areas. */
  const { visibleGroups, isCapped } = useMemo(() => {
    const inView =
      !deferredBounds
        ? groups
        : groups.filter((g) =>
            deferredBounds.contains([g.coords.lat, g.coords.lng] as [number, number]),
          );
    const cap = maxVisible > 0 ? maxVisible : inView.length;
    const capped = inView.length > cap;
    return {
      visibleGroups: capped ? inView.slice(0, cap) : inView,
      isCapped: capped,
    };
  }, [groups, deferredBounds, maxVisible]);

  const handleSaved = useCallback(
    (updates?: Partial<Pick<GedItem, 'title' | 'description'>>) => {
      const idToSync = selectedGed?.id;
      if (updates && selectedGed) {
        setSelectedGed((prev) => (prev ? { ...prev, ...updates } : null));
      }
      refetch().then((nextItems) => {
        if (idToSync && nextItems.length) {
          const found = nextItems.find((i) => i.id === idToSync);
          if (found) setSelectedGed(found);
        }
      });
    },
    [selectedGed, refetch],
  );

  const handleSelectGed = useCallback((ged: GedItem) => {
    setSelectedGed(ged);
  }, []);

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <main className="flex flex-col pb-12 pt-20">
        <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 md:flex-row">
          {loading && (
            <div className="flex h-40 flex-1 items-center justify-center text-sm text-neutral-500">
              {t('mapPage:loading')}
            </div>
          )}
          {error && !loading && (
            <div className="flex-1 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error === 'LOAD_ERROR' ? t('mapPage:loadError') : error}
            </div>
          )}
          {!loading && !error && groups.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
              {t('mapPage:noGedsWithCoords')}
            </div>
          )}

          {!loading && !error && groups.length > 0 && (
            <>
              <div
                className="relative min-h-[70vh] flex-1 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm"
                aria-label={t('mapPage:mapAria')}
              >
                <MapContainer
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={8}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapBoundsUpdater
                    onBoundsChange={setBounds}
                    boundsPad={boundsPad}
                    debounceMs={boundsDebounceMs}
                  />
                  {visibleGroups.map((group) => (
                    <MapGroupMarker
                      key={group.positionKey}
                      group={group}
                      onSelectLocationGroup={setSelectedLocationGroup}
                      onSelectGed={handleSelectGed}
                    />
                  ))}
                </MapContainer>
                {isCapped && (
                  <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-neutral-800/90 px-3 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur-sm">
                    {t('mapPage:zoomInToSeeMore')}
                  </div>
                )}
              </div>

              <MapLocationPanel
                group={selectedLocationGroup}
                onSelectGed={handleSelectGed}
                onClose={() => setSelectedLocationGroup(null)}
              />
            </>
          )}
        </section>
      </main>

      <QualiphotoDetailModal
        ged={selectedGed}
        imageUrl={selectedGed ? buildImageUrl(selectedGed) : ''}
        onClose={() => setSelectedGed(null)}
        onSaved={handleSaved}
      />
    </div>
  );
};
