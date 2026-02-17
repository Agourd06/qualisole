import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GedItem } from '../../ged/types/ged.types';
import { buildImageUrl, isVideoUrl, isAudioUrl } from '../../ged/utils/qualiphotoHelpers';
import type { LocationGroup } from '../utils/groupByPosition';

export interface MapLocationPanelProps {
  /** When set, shows the list of GEDs at this location (only if more than one). */
  group: LocationGroup<GedItem> | null;
  onSelectGed: (ged: GedItem) => void;
  onClose: () => void;
}

export const MapLocationPanel: React.FC<MapLocationPanelProps> = ({
  group,
  onSelectGed,
  onClose,
}) => {
  const { t } = useTranslation(['mapPage', 'qualiphotoPage']);

  if (!group || group.items.length <= 1) return null;

  const count = group.items.length;

  return (
    <aside
      className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm md:w-[320px] md:flex-shrink-0"
      aria-label={t('mapPage:locationPanelAria', { count })}
    >
      <div className="flex items-start justify-between border-b border-neutral-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-800">
            {t('mapPage:manyGedsAtLocation', { count })}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {t('mapPage:selectOneBelow')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label={t('qualiphotoPage:dismiss')}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-2">
          {group.items.map((ged) => (
            <li key={ged.id}>
              <button
                type="button"
                onClick={() => onSelectGed(ged)}
                className="flex w-full items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                  {ged.url ? (
                    isVideoUrl(ged.url) ? (
                      <video
                        src={buildImageUrl(ged)}
                        className="h-full w-full object-cover object-top"
                        preload="metadata"
                        muted
                        playsInline
                        aria-hidden
                      />
                    ) : isAudioUrl(ged.url) ? (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-neutral-500">
                        <span className="text-[10px] font-semibold uppercase">Audio</span>
                      </div>
                    ) : (
                      <img
                        src={buildImageUrl(ged)}
                        alt=""
                        className="h-full w-full object-cover object-top overflow-hidden"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {ged.title || t('mapPage:noTitle')}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {ged.chantier ?? ged.categorie ?? '—'}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
