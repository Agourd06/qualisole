import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GedParalleleItem } from '../types/gedParallele.types';
import { ParalleleSlot } from './ParalleleSlot';
import { slotDroppableId } from './utils';

export interface ParalleleRowProps {
  item: GedParalleleItem;
  rowIndex: number;
  onSlotClick?: (row: GedParalleleItem, slot: 1 | 2) => void | Promise<void>;
}

export const ParalleleRow: React.FC<ParalleleRowProps> = ({ item, rowIndex, onSlotClick }) => {
  const { t } = useTranslation('qualiphotoPage');

  return (
    <article className="rounded-2xl bg-white/40 py-1 px-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <ParalleleSlot
          row={item}
          rowId={item.id}
          slot={1}
          rowIndex={rowIndex}
          label={t('avantLabel', 'Avant')}
          title={item.title1}
          url={item.url1}
          kind={item.kind1}
          slotDroppableId={slotDroppableId}
          showDragHandle={true}
          onSlotClick={onSlotClick}
        />
        <ParalleleSlot
          row={item}
          rowId={item.id}
          slot={2}
          rowIndex={rowIndex}
          label={t('apresLabel', 'Après')}
          title={item.title2}
          url={item.url2}
          kind={item.kind2}
          slotDroppableId={slotDroppableId}
          showDragHandle={true}
          onSlotClick={onSlotClick}
        />
      </div>
    </article>
  );
};
