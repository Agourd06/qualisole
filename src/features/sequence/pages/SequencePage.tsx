import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { getGeds } from '../../ged/services/ged.service';
import { QUALIPHOTO_KIND, IDSOURCE_MAIN, IDSOURCE_EMPTY_GUID } from '../../ged/constants';
import type { GedItem } from '../../ged/types/ged.types';
import {
  buildImageUrl,
  getCreatedAtRaw,
  isMediaUrl,
  isVideoUrl,
  isAudioUrl,
} from '../../ged/utils/qualiphotoHelpers';
import { QualiphotoDetailModal } from '../../ged/components/QualiphotoDetailModal';
import { QualiphotoCard } from '../../ged/components/QualiphotoGallerySection';

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

                <div className="w-[66vw] max-w-4xl">
                  <QualiphotoCard
                    imageUrl={buildImageUrl(currentGed)}
                    title={currentGed.title || 'Sans titre'}
                    author={currentGed.author}
                    chantier={currentGed.chantier ?? currentGed.categorie}
                    createdAt={getCreatedAtRaw(currentGed) ?? ''}
                    onClick={() => {
                      lastUserInteractionRef.current = Date.now();
                      setSelectedGed(currentGed);
                    }}
                    ged={currentGed}
                    isVideo={isVideoUrl(currentGed.url)}
                    isAudio={isAudioUrl(currentGed.url)}
                  />
                </div>

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

