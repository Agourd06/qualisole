import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import { getGeds, moveGedToMain, setGedChantier } from '../services/ged.service';
import type { GedMovePayload } from '../services/ged.service';
import { isNoChantierSelected } from '../../../constants/chantier';
import { buildImageUrl, getCreatedAtRaw, isImageOrVideoUrl, isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import { applyOrderToItems, filterFolderImageGeds } from '../utils/folderGedFilter';
import { QualiphotoCard } from '../components/QualiphotoGallerySection';
import { QualiphotoDetailModal } from '../components/QualiphotoDetailModal';
import { QualiphotoFolderPanel } from '../components/QualiphotoFolderPanel';
import { useQualiphotoByFolder } from '../hooks/useQualiphotoByFolder';
import { useFolderImageOrder } from '../hooks/useFolderImageOrder';
import { useMoveGedToFolder } from '../hooks/useMoveGedToFolder';
import type { GedItem } from '../types/ged.types';

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [removed] = copy.splice(from, 1);
  copy.splice(to, 0, removed);
  return copy;
}
import {
  QUALIPHOTO_KIND,
  IDSOURCE_MAIN,
  IDSOURCE_EMPTY_GUID,
  QUALIPHOTO_ITEMS_PER_PAGE,
  isUnassignedIdsource,
} from '../constants';

const GED_LIMIT = 500;
const DROPPABLE_LEFT = 'unassigned';
const DROPPABLE_RIGHT = 'assigned';

/** Left column filter mode */
type LeftFilterMode = 'all' | 'withoutChantier' | 'withoutFolder';

function filterByChantier(items: GedItem[], chantierId: string, chantierTitle: string): GedItem[] {
  return items.filter(
    (g) =>
      (g as GedItem & { chantier_id?: string }).chantier_id === chantierId ||
      (g.chantier != null && g.chantier.trim() !== '' && g.chantier === chantierTitle),
  );
}

function toDateOnly(isoOrDateStr: string): string {
  if (!isoOrDateStr) return '';
  const d = new Date(isoOrDateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMovePayload(ged: GedItem): GedMovePayload {
  return {
    id: ged.id,
    kind: ged.kind,
    title: ged.title,
    description: ged.description ?? null,
  };
}

export const QualiphotoPage: React.FC = () => {
  const { t } = useTranslation(['qualiphotoPage', 'chantierPage']);
  const {
    selectedFolder,
    selectedChantier,
    selectedAuthorId,
    dateDebut,
    dateFin,
    refreshTrigger,
  } = useNavbarFilters();

  const [leftItems, setLeftItems] = useState<GedItem[]>([]);
  const [leftLoading, setLeftLoading] = useState(true);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);
  const [leftPage, setLeftPage] = useState(1);
  const [leftFilterMode, setLeftFilterMode] = useState<LeftFilterMode>('withoutFolder');
  const [isAssigning, setIsAssigning] = useState(false);
  const [chantierRightItems, setChantierRightItems] = useState<GedItem[]>([]);
  const [chantierRightLoading, setChantierRightLoading] = useState(false);
  const [chantierRightError, setChantierRightError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  /** Bump after move+refetch so DragDropContext remounts and avoids stale draggable refs. */
  const [dndKey, setDndKey] = useState(0);

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

  /** Fetch unassigned GEDs for both idsource=0 and empty GUID, then merge and dedupe by id. */
  const fetchUnassignedGeds = useCallback(async (): Promise<GedItem[]> => {
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

  const refetchLeft = useCallback(async () => {
    try {
      const list = await fetchUnassignedGeds();
      setLeftItems(list);
    } catch {
      // keep current on refetch error
    }
  }, [fetchUnassignedGeds]);

  useEffect(() => {
    let cancelled = false;
    setLeftLoading(true);
    setLeftError(null);
    fetchUnassignedGeds()
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
  }, [fetchUnassignedGeds]);

  const folderId = selectedFolder?.id ?? null;
  const {
    items: folderItems,
    loading: folderLoading,
    error: folderError,
    refetch: refetchFolderList,
  } = useQualiphotoByFolder(folderId);

  const { order: folderImageOrder, setOrder: setFolderImageOrder } =
    useFolderImageOrder(folderId);

  const refetchChantierRight = useCallback(async () => {
    if (!selectedChantier || isNoChantierSelected(selectedChantier) || selectedFolder) {
      setChantierRightItems([]);
      return;
    }
    setChantierRightLoading(true);
    setChantierRightError(null);
    try {
      const list = await fetchChantierGeds(
        selectedChantier.id,
        selectedChantier.title ?? '',
      );
      setChantierRightItems(list.filter((g) => g.url && isImageOrVideoUrl(g.url)));
    } catch (err) {
      setChantierRightError(err instanceof Error ? err.message : 'LOAD_ERROR');
      setChantierRightItems([]);
    } finally {
      setChantierRightLoading(false);
    }
  }, [selectedChantier, selectedFolder, fetchChantierGeds]);

  useEffect(() => {
    if (!selectedChantier || isNoChantierSelected(selectedChantier) || selectedFolder) {
      setChantierRightItems([]);
      setChantierRightError(null);
      return;
    }
    let cancelled = false;
    setChantierRightLoading(true);
    setChantierRightError(null);
    fetchChantierGeds(selectedChantier.id, selectedChantier.title ?? '')
      .then((list) => {
        if (!cancelled) {
          setChantierRightItems(list.filter((g) => g.url && isImageOrVideoUrl(g.url)));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setChantierRightError(err instanceof Error ? err.message : 'LOAD_ERROR');
          setChantierRightItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setChantierRightLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedChantier, selectedFolder, fetchChantierGeds]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchLeft();
      refetchFolderList();
      refetchChantierRight();
      setDndKey((k) => k + 1);
    }
  }, [refreshTrigger, refetchLeft, refetchFolderList, refetchChantierRight]);

  const orderedFolderItems = useMemo(
    () => applyOrderToItems(folderItems, folderImageOrder),
    [folderItems, folderImageOrder],
  );

  /** Left column: unassigned GEDs, filtered by date, author, and left filter mode. */
  const leftFilteredByFilters = useMemo(() => {
    return leftItems.filter((ged) => {
      if (selectedAuthorId != null && selectedAuthorId !== '') {
        const authorId = ged.idauthor ?? (ged as { id_author?: string }).id_author;
        if (String(authorId ?? '') !== String(selectedAuthorId)) return false;
      }
      const gedDateOnly = toDateOnly(ged.created_at);
      if (dateDebut && gedDateOnly < dateDebut) return false;
      if (dateFin && gedDateOnly > dateFin) return false;
      if (leftFilterMode === 'withoutChantier') {
        const chantierId = (ged as GedItem & { chantier_id?: string }).chantier_id;
        const hasChantier =
          (chantierId != null && String(chantierId).trim() !== '') ||
          (ged.chantier != null && ged.chantier.trim() !== '');
        if (hasChantier) return false;
      }
      if (leftFilterMode === 'withoutFolder') {
        if (!isUnassignedIdsource(ged.idsource)) return false;
      }
      return true;
    });
  }, [leftItems, selectedAuthorId, dateDebut, dateFin, leftFilterMode]);

  const leftImageItems = useMemo(
    () =>
      leftFilteredByFilters.filter(
        (item) =>
          item.url &&
          isImageOrVideoUrl(item.url) &&
          isUnassignedIdsource(item.idsource),
      ),
    [leftFilteredByFilters],
  );

  const orderedFolderImageIds = useMemo(
    () => filterFolderImageGeds(orderedFolderItems, folderId).map((i) => i.id),
    [orderedFolderItems, folderId],
  );

  /** Defer refetch so @hello-pangea/dnd can finish cleanup first (avoids "Unable to find draggable" warning). */
  const handleMoveSuccess = useCallback(() => {
    setTimeout(() => {
      refetchLeft();
      refetchFolderList();
      setDndKey((k) => k + 1);
    }, 0);
  }, [refetchLeft, refetchFolderList]);

  const {
    moveGedToFolder,
    moveError,
    clearMoveError,
  } = useMoveGedToFolder({
    folderId,
    onSuccess: handleMoveSuccess,
  });

  const handleSaved = useCallback(
    (updates?: Partial<Pick<GedItem, 'title' | 'description'>>) => {
      if (updates && selectedGed) {
        setSelectedGed({ ...selectedGed, ...updates });
      }
      refetchLeft();
      refetchFolderList();
      refetchChantierRight();
    },
    [selectedGed, refetchLeft, refetchFolderList, refetchChantierRight],
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      if (
        source.droppableId === DROPPABLE_RIGHT &&
        destination.droppableId === DROPPABLE_RIGHT
      ) {
        const newOrderedIds = arrayMove(
          orderedFolderImageIds,
          source.index,
          destination.index,
        );
        await setFolderImageOrder(newOrderedIds);
        return;
      }

      if (
        source.droppableId === DROPPABLE_RIGHT &&
        destination.droppableId === DROPPABLE_LEFT
      ) {
        if (isAssigning) return;

        const rawId = String(draggableId).replace(/^right-/, '');
        const ged = orderedFolderItems.find((i) => String(i.id) === rawId);
        if (!ged) return;

        setIsAssigning(true);
        try {
          await moveGedToMain({ id: String(ged.id), kind: ged.kind });
          handleMoveSuccess();
        } catch {
          handleMoveSuccess();
        } finally {
          setIsAssigning(false);
        }
        return;
      }

      if (
        source.droppableId === DROPPABLE_LEFT &&
        destination.droppableId === DROPPABLE_RIGHT
      ) {
        if (isAssigning || leftFilterMode !== 'withoutFolder') return;

        const rawId = String(draggableId).replace(/^left-/, '');
        const ged = leftImageItems.find((i) => i.id === rawId);
        if (!ged) return;

        if (selectedFolder) {
          setIsAssigning(true);
          try {
            await moveGedToFolder(toMovePayload(ged));
          } catch {
            // moveError shown by useMoveGedToFolder
          } finally {
            setIsAssigning(false);
          }
          return;
        }

        if (selectedChantier && !isNoChantierSelected(selectedChantier)) {
          setIsAssigning(true);
          setAssignError(null);
          try {
            await setGedChantier({
              id: ged.id,
              kind: ged.kind,
              chantierId: selectedChantier.id,
              chantier: selectedChantier.title ?? '',
            });
            refetchLeft();
            refetchChantierRight();
            setDndKey((k) => k + 1);
          } catch {
            setAssignError('ASSIGN_ERROR');
          } finally {
            setIsAssigning(false);
          }
        }
      }
    },
    [
      selectedFolder,
      selectedChantier,
      isAssigning,
      leftFilterMode,
      leftImageItems,
      moveGedToFolder,
      orderedFolderImageIds,
      orderedFolderItems,
      setFolderImageOrder,
      handleMoveSuccess,
      refetchLeft,
      refetchChantierRight,
    ],
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

  const isAnyPending = isAssigning;
  /** Allow drag only when folder is selected and left filter is "Without folder" (no chantier-only assign via drag). */
  const canDragToRight = Boolean(selectedFolder) && leftFilterMode === 'withoutFolder';

  const renderLeftContent = () => {
    if (leftLoading) {
      return (
        <div className="rounded-2xl bg-white/50 px-8 py-16 text-center text-sm text-neutral-500 backdrop-blur-sm">
          {t('loading')}
        </div>
      );
    }
    if (leftError) {
      return (
        <div className="rounded-2xl bg-red-50/70 backdrop-blur-sm px-6 py-4 text-sm text-red-700">
          {leftError === 'LOAD_ERROR' ? t('loadError') : leftError}
        </div>
      );
    }
    return (
      <Droppable droppableId={DROPPABLE_LEFT}>
        {(provided, snapshot) => (
          <section
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 min-h-[200px] rounded-xl p-1 transition-colors ${
              snapshot.isDraggingOver && canDragToRight ? 'ring-2 ring-primary/30 bg-primary/5' : ''
            } ${isAnyPending ? 'opacity-60 pointer-events-none' : ''}`}
            aria-label={t('galleryAria')}
          >
            {leftImageItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-12 text-center text-sm text-neutral-500 min-h-[180px]">
                <p>{t('noImages')}</p>
                <p className="mt-1 font-medium text-neutral-600">{t('dropHereToUnassign')}</p>
              </div>
            ) : (
            leftPaginated.map((ged, index) => (
              <Draggable
                key={ged.id}
                draggableId={`left-${ged.id}`}
                index={index}
                isDragDisabled={isAnyPending || !canDragToRight}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`flex items-start gap-2 ${snapshot.isDragging ? 'opacity-90 shadow-lg rounded-2xl' : ''}`}
                  >
                    <div
                      {...(canDragToRight ? provided.dragHandleProps : {})}
                      className={`mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                        canDragToRight
                          ? 'cursor-grab bg-neutral-200 text-neutral-500 hover:bg-neutral-300 hover:text-neutral-700 active:cursor-grabbing'
                          : 'cursor-not-allowed bg-neutral-100 text-neutral-400 pointer-events-none'
                      }`}
                      aria-label={t('dragHandleAria')}
                      aria-disabled={!canDragToRight}
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
                    <div className="min-w-0 flex-1">
                      <QualiphotoCard
                        imageUrl={buildImageUrl(ged)}
                        title={ged.title || t('noTitle')}
                        author={ged.author}
                        chantier={ged.chantier ?? ged.categorie}
                        createdAt={getCreatedAtRaw(ged) ?? ''}
                        onClick={() => setSelectedGed(ged)}
                        ged={ged}
                        isVideo={isVideoUrl(ged.url)}
                        isAudio={isAudioUrl(ged.url)}
                      />
                    </div>
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

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    setPage: React.Dispatch<React.SetStateAction<number>>,
  ) =>
    totalPages > 1 ? (
      <nav
        className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200/40 bg-white/60 px-5 py-4 backdrop-blur-sm"
        aria-label={t('paginationAria')}
      >
        <span className="text-sm font-medium text-neutral-600">
          {t('pageOf')} {currentPage} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('previous')}
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      </nav>
    ) : null;

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <DragDropContext key={`${dndKey}-${folderId ?? 'none'}`} onDragEnd={handleDragEnd}>
        <div className="">
          <div className="flex pb-12 pt-12 gap-0">
            {/* Left: all qualiphoto images (idsource = 0 or folder when dossier selected), draggable */}
            <aside
            className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
            style={{ width: '33vw' }}
            aria-label={t('galleryAria')}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLeftFilterMode('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  leftFilterMode === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {t('filterAll')}
              </button>
              <button
                type="button"
                onClick={() => setLeftFilterMode('withoutChantier')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  leftFilterMode === 'withoutChantier'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {t('filterWithoutChantier')}
              </button>
              <button
                type="button"
                onClick={() => setLeftFilterMode('withoutFolder')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  leftFilterMode === 'withoutFolder'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {t('filterWithoutFolder')}
              </button>
            </div>
            <div>{renderLeftContent()}</div>
            {!leftLoading && !leftError && leftImageItems.length > 0 &&
              renderPagination(leftPage, leftTotalPages, setLeftPage)}
          </aside>

          <div
            className="mx-6 w-[3px] self-stretch bg-primary rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
            aria-hidden
          />

          {/* Right: folder panel (when dossier selected) or chantier panel (when chantier only) */}
          {selectedFolder ? (
            <QualiphotoFolderPanel
              selectedFolder={selectedFolder}
              chantierTitle={selectedChantier?.title ?? null}
              orderedFolderItems={orderedFolderItems}
              folderLoading={folderLoading}
              folderError={folderError}
              moveError={moveError}
              clearMoveError={clearMoveError}
              isAssigning={isAssigning}
              onSelectGed={setSelectedGed}
              onRefetchFolder={refetchFolderList}
              canDropFromLeft={canDragToRight}
            />
          ) : selectedChantier && !isNoChantierSelected(selectedChantier) ? (
            <aside
              className="flex shrink-0 flex-col pr-8 sm:pr-12 lg:pr-16"
              style={{ width: '47vw' }}
              aria-label={t('galleryAria')}
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20 px-4 py-2.5 text-center">
                  <p className="text-sm font-semibold text-primary truncate">
                    {selectedChantier.title}
                    <span className="ml-2 text-primary/80">
                      · {chantierRightItems.length} {t('chantierPage:gedCount', 'GED(s)')}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refetchChantierRight()}
                  disabled={chantierRightLoading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-primary hover:text-primary disabled:opacity-50"
                  aria-label={t('refreshFolderGeds')}
                  title={t('refreshFolderGeds')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {assignError && (
                <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {assignError === 'ASSIGN_ERROR' ? t('chantierPage:assignError', 'Failed to assign.') : assignError}
                  <button type="button" onClick={() => setAssignError(null)} className="ml-2 underline">
                    {t('dismiss')}
                  </button>
                </div>
              )}
              {chantierRightLoading ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white/50 py-16 text-center text-sm text-neutral-500">
                  {t('loading')}
                </div>
              ) : chantierRightError ? (
                <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700">
                  {chantierRightError === 'LOAD_ERROR' ? t('loadError') : chantierRightError}
                </div>
              ) : (
                <Droppable droppableId={DROPPABLE_RIGHT} isDropDisabled={!canDragToRight}>
                  {(provided, snapshot) => (
                    <section
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex min-h-[200px] flex-col gap-3 rounded-xl p-1 transition-colors ${
                        snapshot.isDraggingOver ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : ''
                      } ${isAssigning ? 'pointer-events-none opacity-60' : ''}`}
                      aria-label={t('chantierPage:chantierGedsAria', 'GEDs in this chantier')}
                    >
                      <p className="text-[0.65rem] font-medium uppercase tracking-wider text-neutral-500">
                        {t('dropHereChantier', 'Drop a GED here to assign to chantier. Click to edit.')}
                      </p>
                      {chantierRightItems.length === 0 ? (
                        <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-8 text-center text-sm text-neutral-500">
                          <p>{t('chantierPage:noChantierGeds', 'No GEDs in this chantier yet.')}</p>
                        </div>
                      ) : (
                        chantierRightItems.map((ged, index) => (
                          <Draggable key={ged.id} draggableId={`right-${ged.id}`} index={index} isDragDisabled>
                            {(providedInner) => (
                              <div
                                ref={providedInner.innerRef}
                                {...providedInner.draggableProps}
                                className="relative"
                              >
                                <QualiphotoCard
                                  imageUrl={buildImageUrl(ged)}
                                  title={ged.title || t('noTitle')}
                                  author={ged.author}
                                  chantier={ged.chantier ?? ged.categorie}
                                  createdAt={getCreatedAtRaw(ged) ?? ''}
                                  onClick={() => setSelectedGed(ged)}
                                  ged={ged}
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
              )}
            </aside>
          ) : (
            <aside
              className="flex shrink-0 flex-col items-center justify-center pr-8 sm:pr-12 lg:pr-16"
              style={{ width: '47vw', minHeight: 200 }}
            >
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 p-8 text-center text-sm text-neutral-500">
                <p>{t('selectFolderToSeeGeds')}</p>
              </div>
            </aside>
          )}
          </div>
          {isAssigning && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm"
              aria-live="polite"
              aria-busy="true"
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
                <p className="text-sm font-medium">{t('movingRefreshing')}</p>
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
