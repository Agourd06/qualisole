import React, { useEffect, useMemo, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { GedItem } from '../types/ged.types';
import { buildImageUrl, getCreatedAtRaw, isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import { QualiphotoCard } from '../components/QualiphotoGallerySection';
import { DROPPABLE_GEDS, DEFAULT_PAGE_SIZE } from './constants';

export interface SuiviLeftColumnProps {
  leftImageItems: GedItem[];
  loading: boolean;
  error: string | null;
  onCardClick: (ged: GedItem) => void;
  t: (key: string, fallback?: string) => string;
  disabled?: boolean;
  /** Shown when left is empty because chantier/folder not selected. */
  emptyHint?: string | null;
}

export const SuiviLeftColumn: React.FC<SuiviLeftColumnProps> = ({
  leftImageItems,
  loading,
  error,
  onCardClick,
  t,
  disabled = false,
  emptyHint,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => setCurrentPage(1), [leftImageItems.length]);
  const totalPages = Math.max(1, Math.ceil(leftImageItems.length / DEFAULT_PAGE_SIZE));
  const paginatedItems = useMemo(
    () =>
      leftImageItems.slice(
        (currentPage - 1) * DEFAULT_PAGE_SIZE,
        currentPage * DEFAULT_PAGE_SIZE,
      ),
    [leftImageItems, currentPage],
  );

  if (loading) {
    return (
      <aside
        className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
        style={{ width: '33vw' }}
        aria-label={t('galleryAria')}
      >
        <div className="rounded-2xl bg-white/50 px-8 py-16 text-center text-sm text-neutral-500 backdrop-blur-sm">
          {t('loading')}
        </div>
      </aside>
    );
  }
  if (error) {
    return (
      <aside
        className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
        style={{ width: '33vw' }}
        aria-label={t('galleryAria')}
      >
        <div className="rounded-2xl bg-red-50/70 backdrop-blur-sm px-6 py-4 text-sm text-red-700">
          {error === 'LOAD_ERROR' ? t('loadError') : error}
        </div>
      </aside>
    );
  }
  const isAnyPending = disabled;

  return (
    <aside
      className="flex shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
      style={{ width: '33vw' }}
      aria-label={t('galleryAria')}
    >
      <Droppable droppableId={DROPPABLE_GEDS} isDropDisabled={disabled}>
        {(droppableProvided, snapshot) => (
          <section
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className={`flex flex-col gap-3 min-h-[200px] rounded-xl p-1 transition-colors ${
              snapshot.isDraggingOver ? 'ring-2 ring-primary/30 bg-primary/5' : ''
            } ${isAnyPending ? 'opacity-60 pointer-events-none' : ''}`}
            aria-label={t('galleryAria')}
          >
            {leftImageItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-12 text-center text-sm text-neutral-500 min-h-[180px]">
                <p>{emptyHint ?? t('noImages')}</p>
                {!emptyHint && (
                  <p className="mt-1 font-medium text-neutral-600">{t('dropHereToUnassign')}</p>
                )}
              </div>
            ) : (
              paginatedItems.map((ged, index) => (
                <Draggable
                  key={ged.id}
                  draggableId={`left-${ged.id}`}
                  index={index}
                  isDragDisabled={disabled}
                >
                  {(provided, dragSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-start gap-2 rounded-2xl ${dragSnapshot.isDragging ? 'opacity-90 shadow-lg' : ''}`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="mt-4 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full bg-neutral-200 text-neutral-500 transition hover:bg-neutral-300 hover:text-neutral-700 active:cursor-grabbing"
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
                      <div className="min-w-0 flex-1">
                        <QualiphotoCard
                          imageUrl={buildImageUrl(ged)}
                          title={ged.title || t('noTitle')}
                          description={ged.description}
                          author={ged.author}
                          chantier={ged.chantier ?? ged.categorie}
                          createdAt={getCreatedAtRaw(ged) ?? ''}
                          onClick={() => onCardClick(ged)}
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
            {droppableProvided.placeholder}
          </section>
        )}
      </Droppable>
      {totalPages > 1 && (
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('previous')}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('next')}
            </button>
          </div>
        </nav>
      )}
    </aside>
  );
};
