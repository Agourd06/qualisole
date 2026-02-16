import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import { getGeds, setGedChantier } from '../../ged/services/ged.service';
import { buildImageUrl, isImageOrVideoUrl, isVideoUrl, isAudioUrl } from '../../ged/utils/qualiphotoHelpers';
import { QualiphotoCard } from '../../ged/components/QualiphotoGallerySection';
import { QualiphotoDetailModal } from '../../ged/components/QualiphotoDetailModal';
import {
  QUALIPHOTO_KIND,
  IDSOURCE_MAIN,
  IDSOURCE_EMPTY_GUID,
  QUALIPHOTO_ITEMS_PER_PAGE,
  isUnassignedIdsource,
} from '../../ged/constants';
import type { GedItem } from '../../ged/types/ged.types';

const GED_LIMIT = 500;
const DROPPABLE_LEFT = 'chantier-geds';
const DROPPABLE_RIGHT = 'chantier-assigned';

function toDateOnly(isoOrDateStr: string): string {
  if (!isoOrDateStr) return '';
  const d = new Date(isoOrDateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns GEDs that belong to the given chantier (by id or name). */
function filterByChantier(items: GedItem[], chantierId: string, chantierTitle: string): GedItem[] {
  return items.filter(
    (g) =>
      (g as GedItem & { chantier_id?: string }).chantier_id === chantierId ||
      (g.chantier != null && g.chantier.trim() !== '' && g.chantier === chantierTitle),
  );
}

export const ChantierPage: React.FC = () => {
  const { t } = useTranslation(['chantierPage', 'qualiphotoPage']);
  const {
    selectedChantier,
    selectedAuthorId,
    dateDebut,
    dateFin,
    refreshTrigger,
  } = useNavbarFilters();

  const [leftItems, setLeftItems] = useState<GedItem[]>([]);
  const [leftLoading, setLeftLoading] = useState(true);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightItems, setRightItems] = useState<GedItem[]>([]);
  const [rightLoading, setRightLoading] = useState(false);
  const [rightError, setRightError] = useState<string | null>(null);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);
  const [leftPage, setLeftPage] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [dndKey, setDndKey] = useState(0);

  /** Fetch all GEDs (unassigned pool: idsource 0 + empty GUID), merged and deduped. */
  const fetchAllGeds = useCallback(async (): Promise<GedItem[]> => {
    const [list0, listGuid] = await Promise.all([
      getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_MAIN, limit: GED_LIMIT }),
      getGeds({ kind: QUALIPHOTO_KIND, idsource: IDSOURCE_EMPTY_GUID, limit: GED_LIMIT }),
    ]);
    const byId = new Map<string, GedItem>();
    for (const item of [...list0, ...listGuid]) byId.set(item.id, item);
    return Array.from(byId.values());
  }, []);

  /** Fetch GEDs for the selected chantier (backend chantier_id filter + client-side fallback). */
  const fetchChantierGeds = useCallback(
    async (chantierId: string, chantierTitle: string): Promise<GedItem[]> => {
      const withFilter = await getGeds({
        kind: QUALIPHOTO_KIND,
        idsource: IDSOURCE_MAIN,
        limit: GED_LIMIT,
        chantierId,
      });
      const filtered = filterByChantier(withFilter, chantierId, chantierTitle);
      if (filtered.length > 0) return filtered;
      const fallback = await getGeds({
        kind: QUALIPHOTO_KIND,
        idsource: IDSOURCE_MAIN,
        limit: GED_LIMIT,
      });
      return filterByChantier(fallback, chantierId, chantierTitle);
    },
    [],
  );

  const refetchLeft = useCallback(async () => {
    try {
      const list = await fetchAllGeds();
      setLeftItems(list);
      setDndKey((k) => k + 1);
    } catch {
      // keep current on refetch error
    }
  }, [fetchAllGeds]);

  const refetchRight = useCallback(async () => {
    if (!selectedChantier) {
      setRightItems([]);
      return;
    }
    setRightLoading(true);
    setRightError(null);
    try {
      const list = await fetchChantierGeds(
        selectedChantier.id,
        selectedChantier.title ?? '',
      );
      setRightItems(list);
    } catch (err) {
      setRightError(err instanceof Error ? err.message : 'LOAD_ERROR');
      setRightItems([]);
    } finally {
      setRightLoading(false);
    }
  }, [selectedChantier, fetchChantierGeds]);

  useEffect(() => {
    let cancelled = false;
    setLeftLoading(true);
    setLeftError(null);
    fetchAllGeds()
      .then((list) => {
        if (!cancelled) setLeftItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setLeftError(err instanceof Error ? err.message : 'LOAD_ERROR');
        }
      })
      .finally(() => {
        if (!cancelled) setLeftLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAllGeds]);

  useEffect(() => {
    if (!selectedChantier) {
      setRightItems([]);
      setRightError(null);
      return;
    }
    let cancelled = false;
    setRightLoading(true);
    setRightError(null);
    fetchChantierGeds(selectedChantier.id, selectedChantier.title ?? '')
      .then((list) => {
        if (!cancelled) setRightItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setRightError(err instanceof Error ? err.message : 'LOAD_ERROR');
          setRightItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChantier, fetchChantierGeds]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchLeft();
      refetchRight();
    }
  }, [refreshTrigger, refetchLeft, refetchRight]);

  /** Apply advanced filters: author, date range (inclusive), chantier (when selected). */
  const filteredByFilters = useMemo(() => {
    return leftItems.filter((ged) => {
      if (selectedAuthorId != null && selectedAuthorId !== '') {
        const authorId = ged.idauthor ?? (ged as { id_author?: string }).id_author;
        if (String(authorId ?? '') !== String(selectedAuthorId)) return false;
      }
      const gedDateOnly = toDateOnly(ged.created_at);
      if (dateDebut && gedDateOnly < dateDebut) return false;
      if (dateFin && gedDateOnly > dateFin) return false;
      if (selectedChantier?.title != null && selectedChantier.title !== '') {
        const gedChantier = ged.chantier ?? ged.categorie ?? '';
        if (gedChantier !== selectedChantier.title) return false;
      }
      return true;
    });
  }, [leftItems, selectedAuthorId, dateDebut, dateFin, selectedChantier?.title]);

  const leftImageItems = useMemo(
    () =>
      filteredByFilters.filter(
        (item) =>
          item.url &&
          isImageOrVideoUrl(item.url) &&
          isUnassignedIdsource(item.idsource),
      ),
    [filteredByFilters],
  );

  const rightImageItems = useMemo(
    () =>
      rightItems.filter(
        (item) => item.url && isImageOrVideoUrl(item.url),
      ),
    [rightItems],
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || !selectedChantier) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      if (source.droppableId === DROPPABLE_LEFT && destination.droppableId === DROPPABLE_RIGHT) {
        const ged = leftImageItems.find((i) => i.id === draggableId);
        if (!ged) return;
        setAssignError(null);
        setIsAssigning(true);
        try {
          await setGedChantier({
            id: ged.id,
            kind: ged.kind,
            chantierId: selectedChantier.id,
            chantier: selectedChantier.title ?? '',
          });
          setTimeout(() => {
            refetchLeft();
            refetchRight();
            setDndKey((k) => k + 1);
          }, 0);
        } catch (err) {
          setAssignError(err instanceof Error ? err.message : 'ASSIGN_ERROR');
        } finally {
          setIsAssigning(false);
        }
        return;
      }
    },
    [selectedChantier, leftImageItems, refetchLeft, refetchRight],
  );

  const handleSaved = useCallback(
    (updates?: Partial<Pick<GedItem, 'title' | 'description'>>) => {
      if (updates && selectedGed) {
        setSelectedGed({ ...selectedGed, ...updates });
      }
      refetchLeft();
      refetchRight();
    },
    [selectedGed, refetchLeft, refetchRight],
  );

  const leftTotalPages = Math.max(
    1,
    Math.ceil(leftImageItems.length / QUALIPHOTO_ITEMS_PER_PAGE),
  );
  const leftPaginated = useMemo(
    () =>
      leftImageItems.slice(
        (leftPage - 1) * QUALIPHOTO_ITEMS_PER_PAGE,
        leftPage * QUALIPHOTO_ITEMS_PER_PAGE,
      ),
    [leftImageItems, leftPage],
  );

  useEffect(() => setLeftPage(1), [leftImageItems.length]);

  const renderLeftContent = () => {
    if (leftLoading) {
      return (
        <div className="rounded-2xl bg-white/50 px-8 py-16 text-center text-sm text-neutral-500 backdrop-blur-sm">
          {t('qualiphotoPage:loading')}
        </div>
      );
    }
    if (leftError) {
      return (
        <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700 backdrop-blur-sm">
          {leftError === 'LOAD_ERROR' ? t('qualiphotoPage:loadError') : leftError}
        </div>
      );
    }
    return (
      <Droppable droppableId={DROPPABLE_LEFT}>
        {(provided, snapshot) => (
          <section
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[200px] flex-col gap-3 rounded-xl p-1 transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''
            } ${isAssigning ? 'pointer-events-none opacity-60' : ''}`}
            aria-label={t('chantierPage:allGedsAria', 'All GEDs')}
          >
            {leftImageItems.length === 0 ? (
              <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-12 text-center text-sm text-neutral-500">
                <p>{t('chantierPage:noGeds', 'No GEDs.')}</p>
              </div>
            ) : (
              leftPaginated.map((ged, index) => (
                <Draggable
                  key={ged.id}
                  draggableId={ged.id}
                  index={index}
                  isDragDisabled={isAssigning}
                >
                  {(providedInner, snapshotInner) => (
                    <div
                      ref={providedInner.innerRef}
                      {...providedInner.draggableProps}
                      className={`relative ${snapshotInner.isDragging ? 'rounded-2xl opacity-90 shadow-lg' : ''}`}
                    >
                      <div
                        {...providedInner.dragHandleProps}
                        className="absolute right-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-white/90 text-neutral-500 shadow-sm transition hover:bg-white hover:text-neutral-700 active:cursor-grabbing"
                        aria-label={t('qualiphotoPage:dragHandleAria')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>
                      <QualiphotoCard
                        imageUrl={buildImageUrl(ged)}
                        title={ged.title || t('qualiphotoPage:noTitle')}
                        author={ged.author}
                        chantier={ged.chantier ?? ged.categorie}
                        createdAt={ged.created_at}
                        onClick={() => setSelectedGed(ged)}
                        isVideo={isVideoUrl(ged.url)}
                        isAudio={isAudioUrl(ged.url)}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </section>
        )}
      </Droppable>
    );
  };

  const renderRightContent = () => {
    if (!selectedChantier) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 p-6 text-center text-sm text-neutral-500">
          <p>{t('chantierPage:selectChantier', 'Select a chantier from the top filter.')}</p>
        </div>
      );
    }
    if (rightLoading) {
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white/50 py-16 text-center text-sm text-neutral-500">
          {t('qualiphotoPage:loading')}
        </div>
      );
    }
    if (rightError) {
      return (
        <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700">
          {rightError === 'LOAD_ERROR' ? t('qualiphotoPage:loadError') : rightError}
        </div>
      );
    }
    return (
      <Droppable droppableId={DROPPABLE_RIGHT}>
        {(provided, snapshot) => (
          <section
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[200px] flex-col gap-3 rounded-xl p-1 transition-colors ${
              snapshot.isDraggingOver ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : ''
            } ${isAssigning ? 'pointer-events-none opacity-60' : ''}`}
            aria-label={t('chantierPage:chantierGedsAria', 'GEDs in this chantier')}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-800">
                {selectedChantier.title}
              </h2>
              <span className="text-xs text-neutral-500">
                {rightImageItems.length} {t('chantierPage:gedCount', 'GED(s)')}
              </span>
            </div>
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-neutral-500">
              {t('chantierPage:dropHere', 'Drop a GED here to assign. Click to edit.')}
            </p>
            {assignError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {assignError === 'ASSIGN_ERROR'
                  ? t('chantierPage:assignError', 'Failed to assign. Try again.')
                  : assignError}
              </div>
            )}
            {rightImageItems.length === 0 ? (
              <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-8 text-center text-sm text-neutral-500">
                <p>{t('chantierPage:noChantierGeds', 'No GEDs in this chantier yet.')}</p>
              </div>
            ) : (
              rightImageItems.map((ged, index) => (
                <Draggable
                  key={ged.id}
                  draggableId={`right-${ged.id}`}
                  index={index}
                  isDragDisabled
                >
                  {(providedInner) => (
                    <div
                      ref={providedInner.innerRef}
                      {...providedInner.draggableProps}
                      className="relative"
                    >
                      <QualiphotoCard
                        imageUrl={buildImageUrl(ged)}
                        title={ged.title || t('qualiphotoPage:noTitle')}
                        author={ged.author}
                        chantier={ged.chantier ?? ged.categorie}
                        createdAt={ged.created_at}
                        onClick={() => setSelectedGed(ged)}
                        isVideo={isVideoUrl(ged.url)}
                        isAudio={isAudioUrl(ged.url)}
                        layout="split"
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </section>
        )}
      </Droppable>
    );
  };

  const renderPagination = () =>
    leftTotalPages > 1 ? (
      <nav
        className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200/40 bg-white/60 px-5 py-4 backdrop-blur-sm"
        aria-label={t('qualiphotoPage:paginationAria')}
      >
        <span className="text-sm font-medium text-neutral-600">
          {t('qualiphotoPage:pageOf')} {leftPage} / {leftTotalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLeftPage((p) => Math.max(1, p - 1))}
            disabled={leftPage <= 1}
            className="rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 backdrop-blur-sm"
          >
            {t('qualiphotoPage:previous')}
          </button>
          <button
            type="button"
            onClick={() => setLeftPage((p) => Math.min(leftTotalPages, p + 1))}
            disabled={leftPage >= leftTotalPages}
            className="rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 backdrop-blur-sm"
          >
            {t('qualiphotoPage:next')}
          </button>
        </div>
      </nav>
    ) : null;

  return (
    <div className="mx-auto min-h-screen w-[90%] bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <DragDropContext key={dndKey} onDragEnd={handleDragEnd}>
        <div className="relative">
          <div className="flex gap-0 pb-12 pt-12">
            <aside
              className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
              style={{ width: '33vw' }}
              aria-label={t('chantierPage:allGedsAria', 'All GEDs')}
            >
              <div>{renderLeftContent()}</div>
              {!leftLoading && !leftError && leftImageItems.length > 0 && renderPagination()}
            </aside>

            <div
              className="mx-6 w-[3px] self-stretch rounded-full bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
              aria-hidden
            />

            <section
              className="flex flex-1 flex-col pr-8 sm:pr-12 lg:pr-16"
              style={{ minWidth: 320, maxWidth: '47vw' }}
              aria-label={t('chantierPage:chantierDropAria', 'Chantier GEDs')}
            >
              {renderRightContent()}
            </section>
          </div>

          {isAssigning && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3 text-neutral-700">
                <svg
                  className="h-10 w-10 animate-spin text-[rgb(0,82,155)]"
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
                <p className="text-sm font-medium">{t('chantierPage:assigning', 'Assigning…')}</p>
              </div>
            </div>
          )}
        </div>
      </DragDropContext>

      <QualiphotoDetailModal
        ged={selectedGed}
        imageUrl={selectedGed ? buildImageUrl(selectedGed) : ''}
        onClose={() => setSelectedGed(null)}
        onSaved={handleSaved}
      />
    </div>
  );
};
