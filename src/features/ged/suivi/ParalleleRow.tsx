import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GedItem } from '../types/ged.types';
import type { GedParalleleItem } from '../types/gedParallele.types';
import { ParalleleSlot } from './ParalleleSlot';
import { rowSlotToGedItem, slotDroppableId } from './utils';

export interface ParalleleRowProps {
  item: GedParalleleItem;
  rowIndex: number;
  folderId: string | null;
  onSlotClick?: (ged: GedItem) => void;
}

export const ParalleleRow: React.FC<ParalleleRowProps> = ({ item, rowIndex, folderId, onSlotClick }) => {
  const { t } = useTranslation('qualiphotoPage');

  const ged1 = rowSlotToGedItem(item, 1, folderId);
  const ged2 = rowSlotToGedItem(item, 2, folderId);

  return (
    <article className="rounded-2xl bg-white/40 py-1 px-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <ParalleleSlot
          rowId={item.id}
          slot={1}
          rowIndex={rowIndex}
          label={t('avantLabel', 'Avant')}
          title={item.title1}
          url={item.url1}
          kind={item.kind1}
          slotDroppableId={slotDroppableId}
          showDragHandle={true}
          ged={ged1}
          onSlotClick={onSlotClick}
        />
        <ParalleleSlot
          rowId={item.id}
          slot={2}
          rowIndex={rowIndex}
          label={t('apresLabel', 'Après')}
          title={item.title2}
          url={item.url2}
          kind={item.kind2}
          slotDroppableId={slotDroppableId}
          showDragHandle={true}
          ged={ged2}
          onSlotClick={onSlotClick}
        />
      </div>
    </article>
  );
};
