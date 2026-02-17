import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { getGeds } from '../../ged/services/ged.service';
import { QUALIPHOTO_KIND, IDSOURCE_MAIN, IDSOURCE_EMPTY_GUID } from '../../ged/constants';
import type { GedItem } from '../../ged/types/ged.types';
import {
  buildImageUrl,
  isMediaUrl,
  isVideoUrl,
  isAudioUrl,
} from '../../ged/utils/qualiphotoHelpers';
import { QualiphotoDetailModal } from '../../ged/components/QualiphotoDetailModal';
import { POWERED_BY } from '../../../utils/constants';

export const SequencePage: React.FC = () => {
  const [items, setItems] = useState<GedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);
  const lastUserInteractionRef = useRef<number>(0);

  const AUTO_ADVANCE_MS = 3000;
  const PAUSE_AFTER_INTERACTION_MS = 3000;

  const fetchAll = useCallback(async (): Promise<GedItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const [list0, listGuid] = await Promise.all([
        getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_MAIN, limit: 500 }),
        getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_EMPTY_GUID, limit: 500 }),
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

  const mediaItems = useMemo(
    () => items.filter((item) => item.url && isMediaUrl(item.url)),
    [items],
  );

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, mediaItems.length - 1));
  const currentGed = mediaItems[safeIndex] ?? null;

  useEffect(() => {
    if (mediaItems.length > 0 && currentIndex >= mediaItems.length) {
      setCurrentIndex(mediaItems.length - 1);
    }
  }, [mediaItems.length, currentIndex]);

  const goPrev = useCallback(() => {
    lastUserInteractionRef.current = Date.now();
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    lastUserInteractionRef.current = Date.now();
    setCurrentIndex((i) => {
      const next = i + 1;
      if (next >= mediaItems.length) return 0;
      return next;
    });
  }, [mediaItems.length]);

  useEffect(() => {
    if (mediaItems.length <= 1) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - lastUserInteractionRef.current;
      if (elapsed < PAUSE_AFTER_INTERACTION_MS) return;
      setCurrentIndex((i) => (i + 1) % mediaItems.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [mediaItems.length]);

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

      <main className="flex flex-col items-center justify-center pb-12 pt-20 min-h-[60vh]">
        <section className="w-full max-w-5xl px-4 flex flex-col items-center">
          {loading && (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
              Chargement…
            </div>
          )}
          {error && !loading && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error === 'LOAD_ERROR' ? 'Erreur lors du chargement.' : error}
            </div>
          )}
          {!loading && !error && mediaItems.length === 0 && (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
              Aucune GED disponible pour le moment.
            </div>
          )}

          {!loading && !error && currentGed && (
            <>
              <div className="relative flex w-full max-w-4xl items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={safeIndex <= 0}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Précédent"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    lastUserInteractionRef.current = Date.now();
                    setSelectedGed(currentGed);
                  }}
                  className="group flex w-[66vw] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                    <div
                      className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded px-2 py-0.5 text-[0.6rem] font-medium tracking-wide text-white/90 shadow-lg"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      aria-hidden
                    >
                      Powered by {POWERED_BY}
                    </div>
                    {(() => {
                      const url = buildImageUrl(currentGed);
                      const isVideo = isVideoUrl(currentGed.url);
                      const isAudio = isAudioUrl(currentGed.url);
                      if (isAudio) {
                        return (
                          <div
                            className="flex h-full w-full flex-col items-center justify-center gap-4 px-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                              <span className="text-xs font-semibold tracking-wide">AUDIO</span>
                            </div>
                            <audio
                              src={url}
                              controls
                              className="w-full max-w-md"
                              aria-label={currentGed.title || 'Audio'}
                            />
                          </div>
                        );
                      }
                      if (isVideo) {
                        return (
                          <video
                            src={url}
                            controls
                            playsInline
                            className="h-full w-full object-contain bg-black/80"
                            aria-label={currentGed.title || 'Vidéo'}
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      }
                      return (
                        <img
                          src={url}
                          alt={currentGed.title}
                          className="h-full w-full object-cover"
                        />
                      );
                    })()}
                  </div>
                  <div className="px-3 py-2 text-left">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {currentGed.title || 'Sans titre'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={safeIndex >= mediaItems.length - 1}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Suivant"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <p className="mt-3 text-xs text-neutral-500">
                {safeIndex + 1} / {mediaItems.length}
              </p>
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

