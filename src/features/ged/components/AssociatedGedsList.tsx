import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildImageUrl, getMediaType } from '../utils/qualiphotoHelpers';
import { POWERED_BY } from '../../../utils/constants';
import type { GedItem } from '../types/ged.types';

export interface AssociatedGedsListProps {
  items: GedItem[];
  loading: boolean;
  error: string | null;
  /** Optional: when provided, list title and empty state are rendered. */
  title?: string;
  /** When true, omit section wrapper (for use inside a collapsible). */
  embedded?: boolean;
  /** Optional: called when an item is clicked (e.g. to open in new tab or preview). */
  onItemClick?: (ged: GedItem) => void;
}

const MEDIA_BADGE_CLASS = 'rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide';

function MediaThumbnail({ ged, className }: { ged: GedItem; className?: string }) {
  const type = getMediaType(ged.url);
  const url = buildImageUrl(ged);

  if (type === 'audio') {
    return (
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ${className ?? ''}`}
        aria-hidden
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ${className ?? ''}`}>
        <video
          src={url}
          className="h-full w-full object-cover"
          preload="metadata"
          muted
          playsInline
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-[0.45rem] font-medium text-white/90"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', lineHeight: 1.2, padding: '1px 2px' }}
          aria-hidden
        >
          {POWERED_BY}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ${className ?? ''}`}>
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-[0.45rem] font-medium text-white/90"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', lineHeight: 1.2, padding: '1px 2px' }}
        aria-hidden
      >
        {POWERED_BY}
      </div>
    </div>
  );
}

/**
 * Compact list of associated GEDs (e.g. in the detail modal).
 * Shows thumbnail/icon, title, and media type badge per item.
 */
const sectionClass = 'border-t border-neutral-200/60 bg-neutral-50/50 px-6 py-4';
const embeddedClass = '';

export const AssociatedGedsList: React.FC<AssociatedGedsListProps> = ({
  items,
  loading,
  error,
  title,
  embedded = false,
  onItemClick,
}) => {
  const { t } = useTranslation('qualiphotoModal');
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const Wrapper = embedded ? 'div' : 'section';
  const wrapperClass = embedded ? embeddedClass : sectionClass;

  if (loading && items.length === 0) {
    return (
      <Wrapper className={wrapperClass} aria-label={title}>
        {title && !embedded && (
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
        )}
        <p className="text-sm text-neutral-500">{t('loadingAssociated')}</p>
      </Wrapper>
    );
  }

  if (error) {
    return (
      <Wrapper className={wrapperClass} aria-label={title}>
        {title && !embedded && (
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
        )}
        <p className="text-sm text-red-600" role="alert">{error}</p>
      </Wrapper>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Wrapper className={wrapperClass} aria-label={title}>
      {title && !embedded && (
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((ged) => {
          const type = getMediaType(ged.url);
          const typeLabel =
            type === 'image'
              ? t('mediaTypeImage')
              : type === 'video'
                ? t('mediaTypeVideo')
                : t('mediaTypeAudio');

          const isAudio = type === 'audio';
          const isVideo = type === 'video';
          const mediaUrl = isAudio || isVideo ? buildImageUrl(ged) : undefined;
          const isVideoExpanded = isVideo && expandedVideoId === ged.id;

          return (
            <li key={ged.id}>
              <div
                role={!isAudio && !isVideo && onItemClick ? 'button' : undefined}
                tabIndex={!isAudio && !isVideo && onItemClick ? 0 : undefined}
                onClick={!isAudio && !isVideo && onItemClick ? () => onItemClick(ged) : undefined}
                onKeyDown={
                  !isAudio && !isVideo && onItemClick
                    ? (e) => e.key === 'Enter' && onItemClick(ged)
                    : undefined
                }
                className={`flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-2.5 transition sm:flex-row sm:items-start ${
                  !isAudio && !isVideo && onItemClick ? 'cursor-pointer hover:border-primary/30 hover:bg-neutral-50' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
                  <MediaThumbnail ged={ged} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {ged.title?.trim() || t('defaultTitle')}
                    </p>
                    <span
                      className={`inline-block mt-0.5 ${MEDIA_BADGE_CLASS} ${
                        type === 'audio'
                          ? 'bg-primary/20 text-primary'
                          : type === 'video'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {typeLabel}
                    </span>
                  </div>
                </div>
                {isAudio && mediaUrl && (
                  <audio
                    src={mediaUrl}
                    controls
                    className="h-9 w-full min-w-0 max-w-full sm:max-w-xs"
                    aria-label={t('playAudioAria')}
                  />
                )}
                {isVideo && mediaUrl && (
                  <div className="w-full min-w-0 sm:max-w-xs">
                    {!isVideoExpanded ? (
                      <button
                        type="button"
                        onClick={() => setExpandedVideoId(ged.id)}
                        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={t('showVideoAria')}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {t('showVideoAria')}
                      </button>
                    ) : (
                      <>
                        <video
                          src={mediaUrl}
                          controls
                          playsInline
                          className="w-full rounded-lg object-contain shadow-sm ring-1 ring-black/5 aspect-video bg-neutral-900"
                          aria-label={t('playVideoAria')}
                        />
                        <button
                          type="button"
                          onClick={() => setExpandedVideoId(null)}
                          className="mt-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                          aria-label={t('hideVideoAria')}
                        >
                          {t('hideVideoAria')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Wrapper>
  );
};
