import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildImageUrl, formatDisplayDate, getCreatedAtRaw, isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import { POWERED_BY } from '../../../utils/constants';
import type { GedItem } from '../types/ged.types';

/** Map pin: visible 0 = green, 1 = orange */
export function MapPinIcon({ visible }: { visible?: number }) {
  const color = visible === 1 ? 'text-primary' : 'text-green-500';
  return (
    <svg className={`h-5 w-5 ${color}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

/** Powered-by stars SVG: iaanalyse true/1 = yellow, false/0 = green */
export function PoweredByStarsIcon({ iaanalyse }: { iaanalyse?: number | boolean }) {
  const isTrue = iaanalyse === 1 || iaanalyse === true;
  const colorClass = isTrue ? 'text-yellow-400' : 'text-green-500';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-6 w-6 shrink-0 ${colorClass}`}
      style={{ fill: 'currentColor', verticalAlign: 'middle', overflow: 'hidden' }}
      viewBox="0 0 1024 1024"
      aria-hidden
    >
      <path d="M602.24 246.72a17.28 17.28 0 0 0-11.84-16.32l-42.88-14.4A90.56 90.56 0 0 1 490.24 160l-14.4-42.88a17.28 17.28 0 0 0-32 0L428.8 160a90.56 90.56 0 0 1-57.28 57.28l-42.88 14.4a17.28 17.28 0 0 0 0 32l42.88 14.4a90.56 90.56 0 0 1 57.28 57.28l14.4 42.88a17.28 17.28 0 0 0 32 0l14.4-42.88a90.56 90.56 0 0 1 57.28-57.28l42.88-14.4a17.28 17.28 0 0 0 12.48-16.96z m301.12 221.76l-48.32-16a101.44 101.44 0 0 1-64-64l-16-48.32a19.2 19.2 0 0 0-36.8 0l-16 48.32a101.44 101.44 0 0 1-64 64l-48.32 16a19.2 19.2 0 0 0 0 36.8l48.32 16a101.44 101.44 0 0 1 64 64l16 48.32a19.2 19.2 0 0 0 36.8 0l16-48.32a101.44 101.44 0 0 1 64-64l48.32-16a19.2 19.2 0 0 0 0-36.8z m-376.64 195.52l-64-20.8a131.84 131.84 0 0 1-83.52-83.52l-20.8-64a25.28 25.28 0 0 0-47.68 0l-20.8 64a131.84 131.84 0 0 1-82.24 83.52l-64 20.8a25.28 25.28 0 0 0 0 47.68l64 20.8a131.84 131.84 0 0 1 83.52 83.84l20.8 64a25.28 25.28 0 0 0 47.68 0l20.8-64a131.84 131.84 0 0 1 83.52-83.52l64-20.8a25.28 25.28 0 0 0 0-47.68z" />
    </svg>
  );
}

/** Mode icon: upload | capture | Video | Frame */
export function ModeIcon({ mode }: { mode?: string | null }) {
  const m = (mode ?? '').toLowerCase();
  const iconClass = 'h-5 w-5 text-primary';
  if (m === 'upload') {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
      </svg>
    );
  }
  if (m === 'capture') {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0 -6.4 0" />
        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
      </svg>
    );
  }
  if (m === 'video') {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
      </svg>
    );
  }
  if (m === 'frame') {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 10h9v9H5z" />
      </svg>
    );
  }
  return (
    <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
    </svg>
  );
}

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
  videoLabel: _videoLabel = 'Video',
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
      </div>
    );
  }
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
      />
    </div>
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

  const iaanalyse = ged?.iaanalyse;
  const visible = ged?.visible;
  const mode = ged?.mode ?? null;
  const chantierLabel = chantier ?? ged?.categorie ?? '—';
  const poweredbyLabel = ged?.poweredby ?? POWERED_BY;

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
      {/* Top overlays: map | [stars SVG (iaanalyse) + poweredby] | mode */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between pt-2 px-3" aria-hidden>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-500/60">
          <MapPinIcon visible={visible} />
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1">
          <PoweredByStarsIcon iaanalyse={iaanalyse} />
          <span className="text-[0.6rem] font-medium tracking-wide text-white">{poweredbyLabel}</span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-500/60">
          <ModeIcon mode={mode} />
        </div>
      </div>
      {/* Bottom bar: author left, chantier middle, date right */}
      <div
        className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-2.5"
        aria-hidden
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-[0.8rem] font-medium text-primary">
            {author || '—'}
          </span>
          <span className="shrink-0 truncate max-w-[120px] text-center text-[0.75rem] text-primary">
            {chantierLabel}
          </span>
          <span className="min-w-0 flex-1 shrink-0 tabular-nums text-right text-[0.8rem] font-medium text-primary">
            {formatDisplayDate(createdAt)}
          </span>
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
            createdAt={getCreatedAtRaw(ged) ?? ''}
            onClick={() => onCardClick(ged)}
            ged={ged}
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
