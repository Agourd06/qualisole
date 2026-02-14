import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildImageUrl, formatDisplayDate, isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import type { GedItem } from '../types/ged.types';

const MEDIA_BADGE_CLASS =
  'absolute left-2 top-2 z-[1] rounded-md px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide shadow-sm';

const DEFAULT_PAGE_SIZE = 10;

function truncateTitle(text: string, maxLength: number = 20): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function truncateDescription(text: string, maxLength: number = 140): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export interface QualiphotoCardProps {
  imageUrl: string;
  title: string;
  description?: string | null;
  author: string | null;
  chantier: string | null;
  createdAt: string;
  onClick?: () => void;
  /** When set with onDragStart, the card is draggable (e.g. left column → right). */
  ged?: GedItem;
  onDragStart?: (e: React.DragEvent, ged: GedItem) => void;
  /** Layout variant: default overlay (full-image) or split (image left, content right). */
  layout?: 'overlay' | 'split';
  /** When true, render a video element instead of img (e.g. .mov, .mp4). */
  isVideo?: boolean;
  /** When true, render an audio placeholder (no thumbnail). */
  isAudio?: boolean;
}

/** Professional photo card: 16:9 aspect, overlay with metadata. Optional drag support. */
function MediaThumbnail({
  src,
  alt,
  isVideo,
  isAudio,
  className,
  videoLabel = 'Video',
  audioLabel = 'Audio',
}: {
  src: string;
  alt: string;
  isVideo?: boolean;
  isAudio?: boolean;
  className?: string;
  videoLabel?: string;
  audioLabel?: string;
}) {
  if (isAudio) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary`}
        aria-label={alt}
      >
        <svg className="h-12 w-12 shrink-0 opacity-90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
        <span className="mt-1 rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
          {audioLabel}
        </span>
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg">
        <video
          src={src}
          className={`${className} rounded-lg`}
          preload="metadata"
          playsInline
          muted
          aria-label={alt}
        />
        <span className={`${MEDIA_BADGE_CLASS} bg-primary text-white`}>{videoLabel}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}

export const QualiphotoCard: React.FC<QualiphotoCardProps> = ({
  imageUrl,
  title,
  description,
  author,
  chantier,
  createdAt,
  onClick,
  ged,
  onDragStart,
  layout = 'overlay',
  isVideo = false,
  isAudio = false,
}) => {
  const { t } = useTranslation('qualiphotoPage');
  const isDraggable = Boolean(ged && onDragStart);
  const mediaClassName = 'h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]';

  if (layout === 'split') {
    const hasDescription = Boolean(description && description.trim().length > 0);
    const isHtmlDescription =
      hasDescription && /<\/?[a-z][\s\S]*>/i.test(description as string);

    return (
      <article
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        draggable={isDraggable}
        onDragStart={isDraggable && ged ? (e) => onDragStart?.(e, ged) : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={`group flex w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out ${
          onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary' : ''
        } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        aria-label={title}
      >
        <div className="relative w-[50%] min-w-[45%] max-w-[52%] h-44 sm:h-48 md:h-52">
          <MediaThumbnail
            src={imageUrl}
            alt={title}
            isVideo={isVideo}
            isAudio={isAudio}
            className={mediaClassName}
            videoLabel={t('mediaTypeVideo')}
            audioLabel={t('mediaTypeAudio')}
          />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 text-[0.75rem] text-neutral-600">
            <span className="shrink-0 tabular-nums font-medium">
              {formatDisplayDate(createdAt)}
            </span>
            <span className="min-w-0 truncate font-semibold">
              {author || '—'}
            </span>
          </div>
          <div className="space-y-1 overflow-hidden">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {truncateTitle(title, 40)}
            </p>
            {hasDescription &&
              (isHtmlDescription ? (
                <div
                  className="max-h-24 overflow-hidden text-xs leading-snug text-neutral-700 break-words"
                  dangerouslySetInnerHTML={{ __html: description as string }}
                />
              ) : (
                <p className="max-h-24 overflow-hidden text-xs leading-snug text-neutral-700 break-words">
                  {truncateDescription(description as string, 220)}
                </p>
              ))}
          </div>
          <p className="mt-1 text-[0.75rem] text-neutral-500 truncate">
            {chantier || '—'}
          </p>
        </div>
      </article>
    );
  }

  return (
  <article
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    draggable={isDraggable}
    onDragStart={isDraggable && ged ? (e) => onDragStart?.(e, ged) : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    className={`group w-full overflow-hidden rounded-2xl transition-all duration-300 ease-out ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    aria-label={title}
  >
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      <MediaThumbnail
        src={imageUrl}
        alt={title}
        isVideo={isVideo}
        isAudio={isAudio}
        className={mediaClassName}
        videoLabel={t('mediaTypeVideo')}
        audioLabel={t('mediaTypeAudio')}
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
            isVideo={isVideoUrl(ged.url)}
            isAudio={isAudioUrl(ged.url)}
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
