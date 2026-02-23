import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import { getGeds } from '../services/ged.service';
import type { GedItem } from '../types/ged.types';
import {
  QUALIPHOTO_KIND,
  IDSOURCE_MAIN,
  IDSOURCE_EMPTY_GUID,
  QUALIPHOTO_ITEMS_PER_PAGE,
} from '../constants';
import { buildImageUrl, getCreatedAtRaw, isImageOrVideoUrl, isVideoUrl, isAudioUrl, getCreatedAtDisplay } from '../utils/qualiphotoHelpers';
import { QualiphotoCard } from '../components/QualiphotoGallerySection';
import { QualiphotoDetailModal } from '../components/QualiphotoDetailModal';
import { useAssignmentDragDrop } from '../assignment/useAssignmentDragDrop';
import { getUsers } from '../../../api/users.api';
import type { User } from '../../../api/users.api';
import { generateFolderGedsTablePdf } from '../utils/qualiphotoPdf';
import { generateFolderGedsTableWord } from '../utils/qualiphotoWord';
import { fetchImageAsDataUrl } from '../utils/gedExportUtils';
import { getMediaType } from '../utils/qualiphotoHelpers';
import type { FolderGedRow } from '../utils/qualiphotoPdf';

const GED_LIMIT = 500;
const DROPPABLE_LEFT = 'unassigned';
const DROPPABLE_RIGHT = 'assigned';

function toDateOnly(isoOrDateStr: string): string {
  if (!isoOrDateStr) return '';
  const d = new Date(isoOrDateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const AssignmentPage: React.FC = () => {
  const { t } = useTranslation(['qualiphotoPage', 'assignmentPage']);
  const {
    selectedAssignedToId,
    selectedAuthorId,
    dateDebut,
    dateFin,
    refreshTrigger,
  } = useNavbarFilters();

  const [leftItems, setLeftItems] = useState<GedItem[]>([]);
  const [leftLoading, setLeftLoading] = useState(true);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightItems, setRightItems] = useState<GedItem[]>([]);
  const [rightLoading, setRightLoading] = useState(true);
  const [rightError, setRightError] = useState<string | null>(null);
  const [selectedGed, setSelectedGed] = useState<GedItem | null>(null);
  const [leftPage, setLeftPage] = useState(1);
  const [rightPage, setRightPage] = useState(1);
  const [dndKey, setDndKey] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [wordGenerating, setWordGenerating] = useState(false);

  /** Fetch all GEDs (unassigned and assigned) */
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

  const refetchLeft = useCallback(async () => {
    setLeftLoading(true);
    try {
      const list = await fetchAllGeds();
      setLeftItems(list);
    } catch {
      // keep current on refetch error
    } finally {
      setLeftLoading(false);
    }
  }, [fetchAllGeds]);

  const refetchRight = useCallback(async () => {
    if (!selectedAssignedToId) {
      setRightItems([]);
      return;
    }
    setRightLoading(true);
    try {
      const list = await fetchAllGeds();
      setRightItems(list);
    } catch {
      // keep current on refetch error
    } finally {
      setRightLoading(false);
    }
  }, [selectedAssignedToId, fetchAllGeds]);

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
    if (!selectedAssignedToId) {
      setRightItems([]);
      setRightLoading(false);
      setRightError(null);
      return;
    }
    let cancelled = false;
    setRightLoading(true);
    setRightError(null);
    fetchAllGeds()
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
  }, [selectedAssignedToId, fetchAllGeds]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchLeft();
      refetchRight();
      setDndKey((k) => k + 1);
    }
  }, [refreshTrigger, refetchLeft, refetchRight]);

  // Fetch users to get user name
  useEffect(() => {
    let cancelled = false;
    getUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        // Silently fail - users list is optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayUserName = useCallback((userId: string | null): string => {
    if (!userId) return '';
    const user = users.find((u) => u.id === userId);
    if (!user) return userId;
    const firstname = (user as { firstname?: string }).firstname ?? '';
    const lastname = (user as { lastname?: string }).lastname ?? '';
    return `${firstname} ${lastname}`.trim() || userId;
  }, [users]);

  /** Left column: all GEDs filtered by date and author */
  const leftFiltered = useMemo(() => {
    return leftItems.filter((ged) => {
      // Filter by author
      if (selectedAuthorId != null && selectedAuthorId !== '') {
        const authorId = ged.idauthor ?? (ged as { id_author?: string }).id_author;
        if (String(authorId ?? '') !== String(selectedAuthorId)) return false;
      }
      // Filter by date
      const gedDateOnly = toDateOnly(ged.created_at);
      if (dateDebut && gedDateOnly < dateDebut) return false;
      if (dateFin && gedDateOnly > dateFin) return false;
      // Exclude already assigned GEDs
      if (ged.assigned && ged.assigned.trim() !== '') return false;
      return true;
    });
  }, [leftItems, selectedAuthorId, dateDebut, dateFin]);

  const leftImageItems = useMemo(
    () =>
      leftFiltered.filter(
        (item) => item.url && isImageOrVideoUrl(item.url),
      ),
    [leftFiltered],
  );

  /** Right column: GEDs assigned to selected user */
  const rightFiltered = useMemo(() => {
    if (!selectedAssignedToId) return [];
    return rightItems.filter((ged) => {
      return ged.assigned && String(ged.assigned).trim() === String(selectedAssignedToId).trim();
    });
  }, [rightItems, selectedAssignedToId]);

  const rightImageItems = useMemo(
    () =>
      rightFiltered.filter(
        (item) => item.url && isImageOrVideoUrl(item.url),
      ),
    [rightFiltered],
  );

  const handleMoveSuccess = useCallback(() => {
    setTimeout(() => {
      refetchLeft();
      refetchRight();
      setDndKey((k) => k + 1);
    }, 0);
  }, [refetchLeft, refetchRight]);

  const { onDragEnd, updateInProgress } = useAssignmentDragDrop({
    assignedToId: selectedAssignedToId,
    leftItems: leftImageItems,
    rightItems: rightImageItems,
    onMoveSuccess: handleMoveSuccess,
  });

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

  const rightTotalPages = Math.max(
    1,
    Math.ceil(rightImageItems.length / QUALIPHOTO_ITEMS_PER_PAGE),
  );
  const rightPaginated = useMemo(
    () =>
      rightImageItems.slice(
        (rightPage - 1) * QUALIPHOTO_ITEMS_PER_PAGE,
        rightPage * QUALIPHOTO_ITEMS_PER_PAGE,
      ),
    [rightImageItems, rightPage],
  );

  useEffect(() => setLeftPage(1), [leftImageItems.length]);
  useEffect(() => setRightPage(1), [rightImageItems.length]);

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
              snapshot.isDraggingOver && selectedAssignedToId ? 'ring-2 ring-primary/30 bg-primary/5' : ''
            } ${updateInProgress ? 'opacity-60 pointer-events-none' : ''}`}
            aria-label={t('galleryAria')}
          >
            {leftImageItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-12 text-center text-sm text-neutral-500 min-h-[180px]">
                <p>{t('noImages')}</p>
                {selectedAssignedToId && (
                  <p className="mt-1 font-medium text-neutral-600">{t('assignmentPage:dropHereToUnassign', 'Drop here to unassign')}</p>
                )}
              </div>
            ) : (
              leftPaginated.map((ged, index) => (
                <Draggable
                  key={ged.id}
                  draggableId={`left-${ged.id}`}
                  index={index}
                  isDragDisabled={updateInProgress || !selectedAssignedToId}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-start gap-2 ${snapshot.isDragging ? 'opacity-90 shadow-lg rounded-2xl' : ''}`}
                    >
                      <div
                        {...(selectedAssignedToId ? provided.dragHandleProps : {})}
                        className={`mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                          selectedAssignedToId
                            ? 'cursor-grab bg-neutral-200 text-neutral-500 hover:bg-neutral-300 hover:text-neutral-700 active:cursor-grabbing'
                            : 'cursor-not-allowed bg-neutral-100 text-neutral-400 pointer-events-none'
                        }`}
                        aria-label={t('dragHandleAria')}
                        aria-disabled={!selectedAssignedToId}
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

  const buildRowsForExport = useCallback(async (): Promise<FolderGedRow[]> => {
    return Promise.all(
      rightImageItems.map(async (ged) => {
        const url = buildImageUrl(ged);
        const mediaType = getMediaType(ged.url);
        const imageDataUrl = mediaType === 'image' && url ? await fetchImageAsDataUrl(url) : null;
        return {
          title: ged.title ?? '',
          description: ged.description ?? '',
          imageDataUrl,
          author: ged.author ?? null,
          publishedDate: getCreatedAtDisplay(ged),
          isVideo: mediaType === 'video',
        };
      }),
    );
  }, [rightImageItems]);

  const handleGeneratePdf = useCallback(async () => {
    if (!selectedAssignedToId || rightImageItems.length === 0 || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const rows = await buildRowsForExport();
      const userName = displayUserName(selectedAssignedToId);
      const title = `Assigned to: ${userName}`;
      const safeName = userName.replace(/[^\w\-]/g, '_');
      await generateFolderGedsTablePdf(
        title,
        rows,
        `assignment-${safeName}-${Date.now()}.pdf`,
      );
    } finally {
      setPdfGenerating(false);
    }
  }, [selectedAssignedToId, rightImageItems.length, pdfGenerating, buildRowsForExport, displayUserName]);

  const handleGenerateWord = useCallback(async () => {
    if (!selectedAssignedToId || rightImageItems.length === 0 || wordGenerating) return;
    setWordGenerating(true);
    try {
      const rows = await buildRowsForExport();
      const userName = displayUserName(selectedAssignedToId);
      const title = `Assigned to: ${userName}`;
      const safeName = userName.replace(/[^\w\-]/g, '_');
      await generateFolderGedsTableWord(
        title,
        rows,
        `assignment-${safeName}-${Date.now()}.docx`,
      );
    } finally {
      setWordGenerating(false);
    }
  }, [selectedAssignedToId, rightImageItems.length, wordGenerating, buildRowsForExport, displayUserName]);

  const renderRightContent = () => {
    if (!selectedAssignedToId) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-12 text-center text-sm text-neutral-500 min-h-[180px]">
          <p>{t('assignmentPage:selectAssignedTo', 'Select "Assigned to" user to see assigned GEDs')}</p>
        </div>
      );
    }
    if (rightLoading) {
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white/50 py-16 text-center text-sm text-neutral-500">
          {t('loading')}
        </div>
      );
    }
    if (rightError) {
      return (
        <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700">
          {rightError === 'LOAD_ERROR' ? t('loadError') : rightError}
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
            } ${updateInProgress ? 'pointer-events-none opacity-60' : ''}`}
            aria-label={t('assignmentPage:assignedGedsAria', 'Assigned GEDs')}
          >
            {rightImageItems.length === 0 ? (
              <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-8 text-center text-sm text-neutral-500">
                <p>{t('assignmentPage:noAssignedGeds', 'No assigned GEDs yet.')}</p>
              </div>
            ) : (
              rightPaginated.map((ged, index) => (
                <Draggable key={ged.id} draggableId={`right-${ged.id}`} index={index}>
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
    );
  };

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <DragDropContext key={`${dndKey}-${selectedAssignedToId ?? 'none'}`} onDragEnd={onDragEnd}>
        <div className="flex pb-12 pt-12 gap-0">
          {/* Left: all unassigned GEDs */}
          <aside
            className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
            style={{ width: '33vw' }}
            aria-label={t('galleryAria')}
          >
            <div>{renderLeftContent()}</div>
            {!leftLoading && !leftError && leftImageItems.length > 0 &&
              renderPagination(leftPage, leftTotalPages, setLeftPage)}
          </aside>

          <div
            className="mx-6 w-[3px] self-stretch bg-primary rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
            aria-hidden
          />

          {/* Right: assigned GEDs */}
          <aside
            className="flex shrink-0 flex-col pr-8 sm:pr-12 lg:pr-16"
            style={{ width: '47vw' }}
            aria-label={t('assignmentPage:assignedGedsAria', 'Assigned GEDs')}
          >
            {/* Header bar with "Assigned to: [user name]" and export buttons */}
            {selectedAssignedToId && (
              <div className="mb-4 flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20 px-4 py-2.5 text-center">
                  <p className="text-sm font-semibold text-primary truncate">
                    {t('assignmentPage:assignedTo', 'Assigned to')}: {displayUserName(selectedAssignedToId)}
                    <span className="ml-2 text-primary/80">
                      · {rightImageItems.length} {rightImageItems.length === 1 ? t('qualiphotoPage:imageCount_one', 'GED') : t('qualiphotoPage:imageCount_other', '{{count}} GEDs', { count: rightImageItems.length })}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={pdfGenerating || rightImageItems.length === 0}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  aria-label={t('generateFolderPdf')}
                  title={t('generateFolderPdf')}
                >
                  {pdfGenerating ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <img src="/pdf.png" alt="" className="h-4 w-4 object-contain" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateWord}
                  disabled={wordGenerating || rightImageItems.length === 0}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50"
                  aria-label={t('generateFolderWord')}
                  title={t('generateFolderWord')}
                >
                  {wordGenerating ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <img src="/word.png" alt="" className="h-4 w-4 object-contain" aria-hidden />
                  )}
                </button>
              </div>
            )}
            <div>{renderRightContent()}</div>
            {!rightLoading && !rightError && rightImageItems.length > 0 &&
              renderPagination(rightPage, rightTotalPages, setRightPage)}
          </aside>
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
