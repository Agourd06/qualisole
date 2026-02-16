import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import type { GedParalleleItem } from '../types/gedParallele.types';
import { isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import { buildMediaUrl } from './utils';

export interface ParalleleSlotProps {
  row: GedParalleleItem;
  rowId: string;
  slot: 1 | 2;
  rowIndex: number;
  label: string;
  title: string | null;
  url: string | null;
  kind: string | null;
  slotDroppableId: (rowId: string, slot: 1 | 2, index: number) => string;
  /** False = hide drag handle (Avant when both slots have content); true = show it (Après always when it has content; Avant only when Après is empty). */
  showDragHandle: boolean;
  /** Called when slot content is clicked. Parent resolves the real GED (by id1/id2 or fetch) and opens the detail modal. */
  onSlotClick?: (row: GedParalleleItem, slot: 1 | 2) => void | Promise<void>;
}

export const ParalleleSlot: React.FC<ParalleleSlotProps> = ({
  row,
  rowId,
  slot,
  rowIndex,
  label,
  title,
  url,
  kind,
  slotDroppableId,
  showDragHandle,
  onSlotClick,
}) => {
  const { t } = useTranslation('qualiphotoPage');
  const droppableId = slotDroppableId(rowId, slot, rowIndex);

  const mediaUrl = buildMediaUrl(url);
  const hasMedia = Boolean(mediaUrl);
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const isAudio = mediaUrl ? isAudioUrl(mediaUrl) : false;

  const normalizedKind = kind?.toLowerCase();
  const isAudioKind = normalizedKind === 'audio' || normalizedKind === 'voice_note';
  const kindLabel = isAudioKind ? t('mediaTypeAudio') : kind;

  const handleContentClick = () => {
    if (onSlotClick) onSlotClick(row, slot);
  };

  const isClickable = hasMedia && onSlotClick;

  const slotContent = hasMedia ? (
    <div
      className="overflow-hidden rounded-xl bg-neutral-50/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleContentClick : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleContentClick() : undefined}
      style={isClickable ? { cursor: 'pointer' } : undefined}
    >
      {isAudio ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <audio
            src={mediaUrl!}
            controls
            className="w-full max-w-xs"
            aria-label={title || label}
          />
        </div>
      ) : isVideo ? (
        <video
          src={mediaUrl!}
          controls
          playsInline
          className="aspect-[4/3] w-full min-h-[200px] object-contain bg-neutral-900/5"
          aria-label={title || label}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={mediaUrl!}
          alt={title || label}
          className="aspect-[4/3] w-full min-h-[220px] object-cover"
        />
      )}
      <div className="border-t border-neutral-100 bg-white/60 px-3 py-2.5">
        <p
          className={`truncate text-sm font-medium text-neutral-700 ${isClickable ? 'cursor-pointer hover:text-neutral-900' : ''}`}
        >
          {title?.trim() || t('noTitle')}
        </p>
      </div>
    </div>
  ) : (
    <div className="flex aspect-[4/3] min-h-[220px] w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 text-sm text-neutral-400">
      {t('missingPhoto', 'Photo non disponible')}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        {kind && (
          <span className="text-[0.65rem] font-medium uppercase tracking-wider text-neutral-400">
            {kindLabel}
          </span>
        )}
      </div>
      <Droppable droppableId={droppableId}>
        {(droppableProvided) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className="min-h-[200px]"
          >
            {hasMedia ? (
              <Draggable draggableId={droppableId} index={0}>
                {(provided, dragSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`relative ${dragSnapshot.isDragging ? 'opacity-90 shadow-lg' : ''}`}
                  >
                    {showDragHandle && (
                      <div
                        {...provided.dragHandleProps}
                        className="absolute top-2 right-2 z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-md bg-white/95 text-neutral-400 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-white hover:text-neutral-600 active:cursor-grabbing"
                        aria-label={t('dragHandleAria')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>
                    )}
                    {slotContent}
                  </div>
                )}
              </Draggable>
            ) : (
              slotContent
            )}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
