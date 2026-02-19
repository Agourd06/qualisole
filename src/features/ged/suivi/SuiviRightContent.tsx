import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { GedParalleleItem } from '../types/gedParallele.types';
import { DROPPABLE_RIGHT } from './constants';
import { ParalleleRow } from './ParalleleRow';
import { SuiviExportToolbar } from './SuiviExportToolbar';

export interface SuiviRightContentProps {
  selectedFolder: { id: string; title?: string; description?: string | null; conclusion?: string | null } | null;
  paralleleItems: GedParalleleItem[];
  paralleleLoading: boolean;
  paralleleError: string | null;
  slotUpdateInProgress: boolean;
  t: (key: string, fallback?: string) => string;
  onSlotClick?: (row: GedParalleleItem, slot: 1 | 2) => void | Promise<void>;
}

export const SuiviRightContent: React.FC<SuiviRightContentProps> = ({
  selectedFolder,
  paralleleItems,
  paralleleLoading,
  paralleleError,
  slotUpdateInProgress,
  t,
  onSlotClick,
}) => {
  if (!selectedFolder) {
    return (
      <div className="rounded-xl bg-neutral-50/80 px-8 py-20 text-center text-sm text-neutral-500">
        {t('selectFolderToSeeGeds')}
      </div>
    );
  }

  if (paralleleLoading && !paralleleItems.length) {
    return (
      <div className="rounded-xl bg-neutral-50/80 px-8 py-20 text-center text-sm text-neutral-500">
        {t('loading')}
      </div>
    );
  }

  if (paralleleError) {
    return (
      <div className="rounded-xl bg-red-50/60 px-5 py-3.5 text-sm text-red-700">
        {paralleleError === 'LOAD_ERROR' ? t('loadError') : paralleleError}
      </div>
    );
  }

  const isAnyPending = slotUpdateInProgress;

  return (
    <div className="flex flex-col gap-1">
      {paralleleItems.length > 0 && (
        <SuiviExportToolbar
          paralleleItems={paralleleItems}
          folderTitle={selectedFolder?.title ?? ''}
          folderId={selectedFolder?.id ?? null}
          folderIntroduction={selectedFolder?.description ?? undefined}
          folderConclusion={selectedFolder?.conclusion ?? undefined}
          disabled={isAnyPending}
        />
      )}
      <Droppable droppableId={DROPPABLE_RIGHT}>
        {(rightProvided, snapshot) => (
          <section
            ref={rightProvided.innerRef}
            {...rightProvided.droppableProps}
            className={`flex min-h-[240px] flex-col gap-4 rounded-2xl py-2 transition-colors ${
              snapshot.isDraggingOver ? 'ring-2 ring-primary/30 bg-primary/5' : ''
            } ${isAnyPending ? 'opacity-60 pointer-events-none' : ''}`}
            aria-label={t('galleryAria')}
          >
            {paralleleItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 py-16 text-center text-sm text-neutral-500 min-h-[200px]">
                <p>{t('noImages')}</p>
                <p className="mt-1.5 text-neutral-500">
                  {t('suiviDropEmptySlotHint', 'Or drag onto an empty Après slot to link to a row')}
                </p>
              </div>
            ) : (
              paralleleItems.map((row, index) => (
                <ParalleleRow
                  key={row.id}
                  item={row}
                  rowIndex={index}
                  onSlotClick={onSlotClick}
                />
              ))
            )}
            {rightProvided.placeholder}
          </section>
        )}
      </Droppable>
    </div>
  );
};
