import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildImageUrl, getMediaType } from '../utils/qualiphotoHelpers';
import type { GedItem } from '../types/ged.types';

export interface AssociatedGedsListProps {
  items: GedItem[];
  loading: boolean;
  error: string | null;
  /** Optional: when provided, list title and empty state are rendered. */
  title?: string;
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
      <video
        src={url}
        className={`h-12 w-12 shrink-0 rounded-lg object-cover ${className ?? ''}`}
        preload="metadata"
        muted
        playsInline
        aria-hidden
      />
    );
  }

  return (
    <img
      src={url}
      alt=""
      className={`h-12 w-12 shrink-0 rounded-lg object-cover ${className ?? ''}`}
      loading="lazy"
    />
  );
}

/**
 * Compact list of associated GEDs (e.g. in the detail modal).
 * Shows thumbnail/icon, title, and media type badge per item.
 */
export const AssociatedGedsList: React.FC<AssociatedGedsListProps> = ({
  items,
  loading,
  error,
  title,
  onItemClick,
}) => {
  const { t } = useTranslation('qualiphotoModal');

  if (loading && items.length === 0) {
    return (
      <section className="border-t border-neutral-200/60 bg-neutral-50/50 px-6 py-4" aria-label={title}>
        {title && (
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
        )}
        <p className="text-sm text-neutral-500">{t('loadingAssociated')}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border-t border-neutral-200/60 bg-neutral-50/50 px-6 py-4" aria-label={title}>
        {title && (
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
        )}
        <p className="text-sm text-red-600" role="alert">{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-neutral-200/60 bg-neutral-50/50 px-6 py-4" aria-label={title}>
      {title && (
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

          return (
            <li key={ged.id}>
              <div
                role={onItemClick ? 'button' : undefined}
                tabIndex={onItemClick ? 0 : undefined}
                onClick={onItemClick ? () => onItemClick(ged) : undefined}
                onKeyDown={
                  onItemClick
                    ? (e) => e.key === 'Enter' && onItemClick(ged)
                    : undefined
                }
                className={`flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-2.5 transition ${
                  onItemClick ? 'cursor-pointer hover:border-primary/30 hover:bg-neutral-50' : ''
                }`}
              >
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
            </li>
          );
        })}
      </ul>
    </section>
  );
};
