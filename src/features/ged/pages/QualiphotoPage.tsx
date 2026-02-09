import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import { getGeds, moveGedToMain } from '../services/ged.service';
import type { GedMovePayload } from '../services/ged.service';
import { buildImageUrl, isImageOrVideoUrl, isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import { applyOrderToItems, filterFolderImageGeds } from '../utils/folderGedFilter';
import { QualiphotoCard } from '../components/QualiphotoGallerySection';
import { QualiphotoDetailModal } from '../components/QualiphotoDetailModal';
import { QualiphotoFolderPanel } from '../components/QualiphotoFolderPanel';
import { UploadGedModal } from '../components/UploadGedModal';
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

function toMovePayload(ged: GedItem): GedMovePayload {
  return {
    id: ged.id,
    kind: ged.kind,
    title: ged.title,
    description: ged.description ?? null,
  };
}

export const QualiphotoPage: React.FC = () => {
  const { t } = useTranslation('qualiphotoPage');
  const { selectedFolder, selectedChantier } = useNavbarFilters();

  const [leftItems, setLeftItems] = useState<GedItem[]>([]);
  const [leftLoading, setLeftLoading] = useState(true);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);
  const [leftPage, setLeftPage] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  /** Bump after move+refetch so DragDropContext remounts and avoids stale draggable refs. */
  const [dndKey, setDndKey] = useState(0);

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

  const leftImageItems = useMemo(
    () =>
      leftItems.filter(
        (item) =>
          item.url &&
          isImageOrVideoUrl(item.url) &&
          isUnassignedIdsource(item.idsource),
      ),
    [leftItems],
  );

  const folderId = selectedFolder?.id ?? null;
  const {
    items: folderItems,
    loading: folderLoading,
    error: folderError,
    refetch: refetchFolderList,
  } = useQualiphotoByFolder(folderId);

  const { order: folderImageOrder, setOrder: setFolderImageOrder } =
    useFolderImageOrder(folderId);

  const orderedFolderItems = useMemo(
    () => applyOrderToItems(folderItems, folderImageOrder),
    [folderItems, folderImageOrder],
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
    },
    [selectedGed, refetchLeft, refetchFolderList],
  );

  const handleUploadSuccess = useCallback(() => {
    refetchLeft();
    refetchFolderList();
    setDndKey((k) => k + 1);
  }, [refetchLeft, refetchFolderList]);

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

        const ged = orderedFolderItems.find((i) => String(i.id) === String(draggableId));
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
        if (!selectedFolder || isAssigning) return;

        const ged = leftImageItems.find((i) => i.id === draggableId);
        if (!ged) return;

        setIsAssigning(true);
        try {
          await moveGedToFolder(toMovePayload(ged));
          // Left and folder lists refresh inside onSuccess (awaited by hook)
        } catch {
          // moveError shown by useMoveGedToFolder
        } finally {
          setIsAssigning(false);
        }
      }
    },
    [
      selectedFolder,
      isAssigning,
      leftImageItems,
      moveGedToFolder,
      orderedFolderImageIds,
      orderedFolderItems,
      setFolderImageOrder,
      handleMoveSuccess,
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
              snapshot.isDraggingOver ? 'ring-2 ring-primary/30 bg-primary/5' : ''
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
                draggableId={ged.id}
                index={index}
                isDragDisabled={isAnyPending}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`relative ${snapshot.isDragging ? 'opacity-90 shadow-lg rounded-2xl' : ''}`}
                  >
                    <div
                      {...provided.dragHandleProps}
                      className="absolute top-2 right-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-white/90 text-neutral-500 shadow-sm transition hover:bg-white hover:text-neutral-700 active:cursor-grabbing"
                      aria-label={t('dragHandleAria')}
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
                      title={ged.title || t('noTitle')}
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
            {/* Left: all qualiphoto images (idsource = 0), draggable */}
            <aside
            className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
            style={{ width: '33vw' }}
            aria-label={t('galleryAria')}
          >
            <div className="flex items-center justify-end gap-4 mb-4">
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {t('uploadGed')}
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

          {/* Right: chantier/folder panel (only GEDs with idsource = selected folder id) */}
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
          />
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
      <UploadGedModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        selectedFolderId={folderId}
        defaultChantier={selectedChantier?.title ?? ''}
      />
    </div>
  );
};
