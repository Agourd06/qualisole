import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import { getGeds } from '../services/ged.service';
import type { GedItem } from '../types/ged.types';
import { useMoveGedToFolder } from '../hooks/useMoveGedToFolder';
import {
  QUALIPHOTO_KIND,
  IDSOURCE_MAIN,
  IDSOURCE_EMPTY_GUID,
  isUnassignedIdsource,
} from '../constants';
import { buildImageUrl, isImageOrVideoUrl } from '../utils/qualiphotoHelpers';
import { useGedParalleleByFolder } from '../hooks/useGedParalleleByFolder';
import { QualiphotoDetailModal } from '../components/QualiphotoDetailModal';
import {
  GED_LIMIT,
  useSuiviDragDrop,
  SuiviLeftColumn,
  SuiviRightContent,
} from '../suivi';

export const SuiviPage: React.FC = () => {
  const { t } = useTranslation('qualiphotoPage');
  const { selectedChantier, selectedFolder, refreshTrigger } = useNavbarFilters();

  const [items, setItems] = useState<GedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);

  const fetchAllGeds = useCallback(async (): Promise<GedItem[]> => {
    const [list0, listGuid] = await Promise.all([
      getGeds({
        kind: QUALIPHOTO_KIND,
        idsource: IDSOURCE_MAIN,
        limit: GED_LIMIT,
      }),
      getGeds({
        kind: QUALIPHOTO_KIND,
        idsource: IDSOURCE_EMPTY_GUID,
        limit: GED_LIMIT,
      }),
    ]);
    const byId = new Map<string, GedItem>();
    for (const item of [...list0, ...listGuid]) byId.set(item.id, item);
    return Array.from(byId.values());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllGeds()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'LOAD_ERROR');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAllGeds]);

  const leftImageItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.url &&
          isImageOrVideoUrl(item.url) &&
          isUnassignedIdsource(item.idsource),
      ),
    [items],
  );

  const folderId = selectedFolder?.id ?? null;
  const {
    items: paralleleItems,
    loading: paralleleLoading,
    error: paralleleError,
    refetch: refetchParallele,
  } = useGedParalleleByFolder(folderId);

  const refetchLeftGeds = useCallback(async () => {
    const list = await fetchAllGeds();
    setItems(list);
  }, [fetchAllGeds]);

  const handleMoveSuccess = useCallback(async () => {
    await Promise.all([refetchParallele(), refetchLeftGeds()]);
  }, [refetchParallele, refetchLeftGeds]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchLeftGeds();
      refetchParallele();
    }
  }, [refreshTrigger, refetchLeftGeds, refetchParallele]);

  const handleSaved = useCallback(
    (updates?: Partial<Pick<GedItem, 'title' | 'description'>>) => {
      if (updates && selectedGed) {
        setSelectedGed({ ...selectedGed, ...updates });
      }
      refetchLeftGeds();
      refetchParallele();
    },
    [selectedGed, refetchLeftGeds, refetchParallele],
  );

  const {
    moveGedToFolder,
    moveError,
    clearMoveError,
  } = useMoveGedToFolder({
    folderId,
    onSuccess: handleMoveSuccess,
  });

  const { onDragEnd, slotUpdateInProgress } = useSuiviDragDrop({
    folderId,
    leftImageItems,
    paralleleItems,
    moveGedToFolder,
    onMoveSuccess: handleMoveSuccess,
  });

  const tWithFallback = useCallback(
    (key: string, fallback?: string) =>
      fallback !== undefined ? t(key, fallback) : t(key),
    [t],
  );

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <main className="flex pb-12 pt-16 gap-6">
        <DragDropContext key={folderId ?? 'no-folder'} onDragEnd={onDragEnd}>
          <SuiviLeftColumn
            leftImageItems={leftImageItems}
            loading={loading}
            error={error}
            onCardClick={setSelectedGed}
            t={tWithFallback}
            disabled={slotUpdateInProgress}
          />
          <div
            className="mx-6 w-[3px] self-stretch bg-primary rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
            aria-hidden
          />
          <section
            className="flex-1 pr-8 sm:pr-12 lg:pr-16"
            aria-label={t('suiviSectionAria', 'Suivi des photos avant/après')}
          >
            {moveError && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <span>{moveError}</span>
                <button type="button" onClick={clearMoveError} className="shrink-0 underline">
                  {t('dismiss')}
                </button>
              </div>
            )}
            {slotUpdateInProgress && (
              <p className="mb-2 text-xs text-neutral-500">{t('moving')}</p>
            )}
            {(selectedChantier || selectedFolder) && (
              <div className="mb-4 flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20 px-4 py-2.5 text-center">
                  <p className="text-sm font-semibold text-primary truncate">
                    {selectedChantier?.title}
                    {selectedChantier?.title && selectedFolder?.title && (
                      <span className="mx-2 text-primary/70">·</span>
                    )}
                    {selectedFolder?.title && (
                      <span className="text-primary/90">{selectedFolder.title}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refetchParallele()}
                  disabled={paralleleLoading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-primary hover:text-primary disabled:opacity-50"
                  aria-label={t('refreshFolderGeds')}
                  title={t('refreshFolderGeds')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            )}
            <SuiviRightContent
              selectedFolder={selectedFolder}
              folderId={folderId}
              paralleleItems={paralleleItems}
              paralleleLoading={paralleleLoading}
              paralleleError={paralleleError}
              slotUpdateInProgress={slotUpdateInProgress}
              t={tWithFallback}
              onSlotClick={setSelectedGed}
            />
          </section>
          {slotUpdateInProgress && (
            <div
              className="fixed inset-0 z-20 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex flex-col items-center gap-3 text-neutral-700">
                <svg
                  className="h-10 w-10 animate-spin text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm font-medium">{t('movingRefreshing')}</p>
              </div>
            </div>
          )}
        </DragDropContext>
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
