import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navbar } from '../../../components/layout/Navbar';
import { getGeds } from '../../ged/services/ged.service';
import {
  QUALIPHOTO_KIND,
  IDSOURCE_MAIN,
  IDSOURCE_EMPTY_GUID,
} from '../../ged/constants';
import type { GedItem } from '../../ged/types/ged.types';
import { QualiphotoDetailModal } from '../../ged/components/QualiphotoDetailModal';
import {
  buildImageUrl,
  isVideoUrl,
  isAudioUrl,
} from '../../ged/utils/qualiphotoHelpers';

// Use local marker assets from /public to avoid bundler path issues.
L.Icon.Default.mergeOptions({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
});

interface LatLng {
  lat: number;
  lng: number;
}

function parseLatLng(ged: GedItem): LatLng | null {
  if (!ged.latitude || !ged.longitude) return null;
  const lat = Number(ged.latitude);
  const lng = Number(ged.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

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

export const MapPage: React.FC = () => {
  const { t } = useTranslation(['mapPage', 'qualiphotoPage']);
  const [items, setItems] = useState<GedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);

  const fetchAll = useCallback(async (): Promise<GedItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const [list0, listGuid] = await Promise.all([
        getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_MAIN, limit: 2000 }),
        getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_EMPTY_GUID, limit: 2000 }),
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

  const geoItems = useMemo(
    () =>
      items
        .map((ged) => {
          const coords = parseLatLng(ged);
          if (!coords) return null;
          return { ged, coords };
        })
        .filter((entry): entry is { ged: GedItem; coords: LatLng } => entry !== null),
    [items],
  );

  const mapCenter: LatLng = useMemo(() => {
    if (geoItems.length === 0) {
      // Rough center of Morocco as a neutral default for your data.
      return { lat: 31.8, lng: -7.1 };
    }
    const sum = geoItems.reduce(
      (acc, { coords }) => {
        acc.lat += coords.lat;
        acc.lng += coords.lng;
        return acc;
      },
      { lat: 0, lng: 0 },
    );
    return {
      lat: sum.lat / geoItems.length,
      lng: sum.lng / geoItems.length,
    };
  }, [geoItems]);

  const handleSaved = useCallback(
    (updates?: Partial<Pick<GedItem, 'title' | 'description'>>) => {
      const idToSync = selectedGed?.id;
      if (updates && selectedGed) {
        setSelectedGed((prev) => (prev ? { ...prev, ...updates } : null));
      }
      fetchAll().then((nextItems) => {
        if (idToSync) {
          const found = nextItems.find((i) => i.id === idToSync);
          if (found) setSelectedGed(found);
        }
      });
    },
    [selectedGed, fetchAll],
  );

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <main className="flex flex-col pb-12 pt-20">
        <section className="w-full max-w-6xl mx-auto px-4">
          {loading && (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
              {t('mapPage:loading')}
            </div>
          )}
          {error && !loading && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error === 'LOAD_ERROR' ? t('mapPage:loadError') : error}
            </div>
          )}
          {!loading && !error && geoItems.length === 0 && (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
              {t('mapPage:noGedsWithCoords')}
            </div>
          )}

          {!loading && !error && (
            <div
              className="mt-4 h-[70vh] overflow-hidden rounded-2xl border border-neutral-200 shadow-sm"
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
                {geoItems.map(({ ged, coords }) => (
                  <Marker key={ged.id} position={[coords.lat, coords.lng]}>
                    <Popup className="map-ged-popup" minWidth={260} maxWidth={320}>
                      <div className="space-y-2">
                        <div className="w-full overflow-hidden rounded-lg bg-neutral-100">
                          <PopupMedia
                            ged={ged}
                            imageUrl={buildImageUrl(ged)}
                            className="block"
                          />
                        </div>
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setSelectedGed(ged)}
                        >
                          <p className="text-sm font-semibold text-neutral-800 line-clamp-2">
                            {ged.title || t('mapPage:noTitle')}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {ged.chantier ?? ged.categorie ?? '—'}
                          </p>
                        </button>
                        <p className="text-[0.7rem] text-neutral-400">
                          {ged.latitude}, {ged.longitude}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
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

