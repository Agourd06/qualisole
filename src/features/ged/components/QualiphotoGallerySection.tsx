import React, { useEffect, useMemo, useState } from 'react';
import { buildImageUrl, formatDisplayDate } from '../utils/qualiphotoHelpers';
import type { GedItem } from '../types/ged.types';

const DEFAULT_PAGE_SIZE = 10;

function truncateTitle(text: string, maxLength: number = 20): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export interface QualiphotoCardProps {
  imageUrl: string;
  title: string;
  author: string | null;
  chantier: string | null;
  createdAt: string;
  onClick?: () => void;
  /** When set with onDragStart, the card is draggable (e.g. left column → right). */
  ged?: GedItem;
  onDragStart?: (e: React.DragEvent, ged: GedItem) => void;
}

/** Professional photo card: 16:9 aspect, overlay with metadata. Optional drag support. */
export const QualiphotoCard: React.FC<QualiphotoCardProps> = ({
  imageUrl,
  title,
  author,
  chantier,
  createdAt,
  onClick,
  ged,
  onDragStart,
}) => {
  const isDraggable = Boolean(ged && onDragStart);
  return (
  <article
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    draggable={isDraggable}
    onDragStart={isDraggable && ged ? (e) => onDragStart?.(e, ged) : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    className={`group w-full overflow-hidden rounded-2xl transition-all duration-300 ease-out ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    aria-label={title}
  >
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      <img
        src={imageUrl}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-12 pb-3 px-5"
        aria-hidden
      >
        <div className="flex justify-between items-center gap-4 mb-2">
          <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-white opacity-95 drop-shadow-lg">
            {author || '—'}
          </span>
          <span className="shrink-0 tabular-nums text-[0.8125rem] font-medium text-white/90 drop-shadow-lg">
            {formatDisplayDate(createdAt)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="min-w-0 truncate text-[0.75rem] text-white/85 drop-shadow-lg">
            {chantier || '—'}
          </span>
          <span className="flex-1 text-center text-[0.75rem] text-white/85 drop-shadow-lg">
            {truncateTitle(title)}
          </span>
          <span className="min-w-0 opacity-0">—</span>
        </div>
      </div>
    </div>
  </article>
  );
};

export interface QualiphotoGallerySectionProps {
  items: GedItem[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  loadingMessage?: string;
  pageSize?: number;
  noTitleLabel: string;
  galleryAria: string;
  paginationAria: string;
  pageOfLabel: string;
  previousLabel: string;
  nextLabel: string;
  loadErrorLabel: string;
  onCardClick: (ged: GedItem) => void;
  /** Enable drag from this gallery; pass handler to set drag data (e.g. for left → right drop). */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, ged: GedItem) => void;
}

/**
 * Reusable qualiphoto gallery: cards list + pagination, loading/error/empty states.
 * Does not fetch data; receives items from parent. Same design for left (date filter) and right (folder filter).
 */
export const QualiphotoGallerySection: React.FC<QualiphotoGallerySectionProps> = ({
  items,
  loading,
  error,
  emptyMessage,
  loadingMessage = 'Loading…',
  pageSize = DEFAULT_PAGE_SIZE,
  noTitleLabel,
  galleryAria,
  paginationAria,
  pageOfLabel,
  previousLabel,
  nextLabel,
  loadErrorLabel,
  onCardClick,
  draggable = false,
  onDragStart,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => setCurrentPage(1), [items.length]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = useMemo(
    () =>
      items.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [items, currentPage, pageSize],
  );

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/50 px-8 py-16 text-center text-sm text-neutral-500 backdrop-blur-sm">
        {loadingMessage}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50/70 backdrop-blur-sm px-6 py-4 text-sm text-red-700">
        {error === 'LOAD_ERROR' ? loadErrorLabel : error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white/50 px-8 py-16 text-center text-sm text-neutral-500 backdrop-blur-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <section
        className="flex flex-col gap-3"
        aria-label={galleryAria}
      >
        {paginatedItems.map((ged) => (
          <QualiphotoCard
            key={ged.id}
            imageUrl={buildImageUrl(ged)}
            title={ged.title || noTitleLabel}
            author={ged.author}
            chantier={ged.chantier ?? ged.categorie}
            createdAt={ged.created_at}
            onClick={() => onCardClick(ged)}
            ged={draggable ? ged : undefined}
            onDragStart={draggable ? onDragStart : undefined}
          />
        ))}
      </section>
      {totalPages > 1 && (
        <nav
          className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200/40 bg-white/60 px-5 py-4 backdrop-blur-sm"
          aria-label={paginationAria}
        >
          <span className="text-sm font-medium text-neutral-600">
            {pageOfLabel} {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {previousLabel}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {nextLabel}
            </button>
          </div>
        </nav>
      )}
    </>
  );
};
