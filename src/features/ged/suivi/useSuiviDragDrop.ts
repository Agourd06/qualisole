import { useCallback, useState } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { getGeds, setGedIdsource, moveGedToMain } from '../services/ged.service';

/** Defer so @hello-pangea/dnd can finish cleanup before we refetch (avoids "Unable to find draggable" warning). */
function scheduleAfterDndCleanup(fn: () => void | Promise<void>): void {
  setTimeout(() => { fn(); }, 0);
}
import type { GedMovePayload } from '../services/ged.service';
import { QUALIPHOTO_KIND } from '../constants';
import type { GedItem } from '../types/ged.types';
import type { GedParalleleItem } from '../types/gedParallele.types';
import { DROPPABLE_GEDS } from './constants';
import {
  parseSlotDroppableId,
  parseFolderDropId,
  toMovePayload,
} from './utils';

/** Normalize URL for comparison (strip leading slash). */
function normalizeUrl(url: string | null): string {
  if (!url) return '';
  return url.startsWith('/') ? url.slice(1) : url;
}

/** Find the GED in the list that matches the row slot (by url or title). */
function findGedInSlot(
  geds: GedItem[],
  row: GedParalleleItem,
  slot: 1 | 2,
): GedItem | undefined {
  const url = slot === 1 ? row.url1 : row.url2;
  const title = slot === 1 ? row.title1 : row.title2;
  const normRowUrl = normalizeUrl(url);
  return geds.find((g) => {
    if (normRowUrl && normalizeUrl(g.url) === normRowUrl) return true;
    if (title != null && title.trim() && g.title?.trim() === title.trim()) return true;
    return false;
  });
}

export interface UseSuiviDragDropArgs {
  folderId: string | null;
  leftImageItems: GedItem[];
  paralleleItems: GedParalleleItem[];
  moveGedToFolder: (payload: GedMovePayload) => Promise<boolean>;
  onMoveSuccess: () => Promise<void>;
}

export function useSuiviDragDrop({
  folderId,
  leftImageItems,
  paralleleItems,
  moveGedToFolder,
  onMoveSuccess,
}: UseSuiviDragDropArgs) {
  const [slotUpdateInProgress, setSlotUpdateInProgress] = useState(false);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      const slotSource = parseSlotDroppableId(source.droppableId);

      const isFromLeft = source.droppableId === DROPPABLE_GEDS;
      const folderZoneId = parseFolderDropId(destination.droppableId);
      const slotDest = parseSlotDroppableId(destination.droppableId);

      if (isFromLeft && folderId) {
        const ged = leftImageItems.find((g) => g.id === draggableId);
        if (!ged) return;
        setSlotUpdateInProgress(true);
        try {
          let idsource: string;
          if (folderZoneId) {
            idsource = folderZoneId;
            await setGedIdsource({ id: ged.id, kind: ged.kind, idsource });
          } else if (slotDest) {
            const row = paralleleItems.find((r) => r.id === slotDest.rowId);
            const isEmptyApresSlot =
              slotDest.slot === 2 && row && !row.idsource2 && !row.url2;
            if (isEmptyApresSlot) {
              idsource = slotDest.rowId;
              await setGedIdsource({ id: ged.id, kind: ged.kind, idsource });
            } else {
              await moveGedToFolder(toMovePayload(ged));
            }
          } else {
            await moveGedToFolder(toMovePayload(ged));
          }
          // Defer refetch so @hello-pangea/dnd can finish cleanup before we update the list (avoids "Unable to find draggable" warning)
          scheduleAfterDndCleanup(onMoveSuccess);
        } catch {
          scheduleAfterDndCleanup(onMoveSuccess);
        } finally {
          setSlotUpdateInProgress(false);
        }
        return;
      }

      // Right → left: only PUT geds/:id?kind=qualiphoto&idsource=00000000-0000-0000-0000-000000000000.
      // Backend removes the GED from gedparallel when idsource is empty GUID — we do nothing else.
      // Get GED id from GEDs API (idsource=rowId), find by url/title; Slot 2: unassign that GED only. Slot 1: unassign both GEDs (clean both id sources).
      if (slotSource && destination.droppableId === DROPPABLE_GEDS) {
        const row = paralleleItems.find((r) => r.id === slotSource.rowId);
        setSlotUpdateInProgress(true);
        try {
          if (row) {
            const gedsInRow = await getGeds({
              kind: QUALIPHOTO_KIND,
              idsource: slotSource.rowId,
              limit: 20,
            });
            if (slotSource.slot === 2) {
              const ged = findGedInSlot(gedsInRow, row, 2);
              if (ged) {
                await moveGedToMain({ id: ged.id, kind: QUALIPHOTO_KIND });
              }
            } else {
              // Slot 1 (Avant): Avant GED may have idsource=folderId — try row GEDs first, then folder GEDs.
              let ged1 = findGedInSlot(gedsInRow, row, 1);
              if (!ged1 && folderId) {
                const folderGeds = await getGeds({
                  kind: QUALIPHOTO_KIND,
                  idsource: folderId,
                  limit: 100,
                });
                ged1 = findGedInSlot(folderGeds, row, 1);
              }
              const ged2 = findGedInSlot(gedsInRow, row, 2);
              if (ged1) await moveGedToMain({ id: ged1.id, kind: QUALIPHOTO_KIND });
              if (ged2 && ged2.id !== ged1?.id) {
                await moveGedToMain({ id: ged2.id, kind: QUALIPHOTO_KIND });
              }
            }
          }
          scheduleAfterDndCleanup(onMoveSuccess);
        } finally {
          setSlotUpdateInProgress(false);
        }
        return;
      }
    },
    [
      folderId,
      leftImageItems,
      paralleleItems,
      moveGedToFolder,
      onMoveSuccess,
    ],
  );

  return { onDragEnd, slotUpdateInProgress };
}
