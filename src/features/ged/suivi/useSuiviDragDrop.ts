import { useCallback, useState } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { getGeds, setGedIdsource, moveGedToMain, setGedChantier } from '../services/ged.service';

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
  findGedInSlot,
} from './utils';

export interface UseSuiviDragDropArgs {
  folderId: string | null;
  selectedChantier: { id: string; title?: string } | null;
  leftImageItems: GedItem[];
  paralleleItems: GedParalleleItem[];
  moveGedToFolder: (payload: GedMovePayload) => Promise<boolean>;
  onMoveSuccess: () => Promise<void>;
}

export function useSuiviDragDrop({
  folderId,
  selectedChantier,
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
        const rawId = String(draggableId).replace(/^left-/, '');
        const ged = leftImageItems.find((g) => g.id === rawId);
        if (!ged) return;
        setSlotUpdateInProgress(true);
        try {
          let idsource: string;
          if (folderZoneId) {
            idsource = folderZoneId;
            await setGedIdsource({ id: ged.id, kind: ged.kind, idsource });
            // Also update chantier if selected
            if (selectedChantier && selectedChantier.id && selectedChantier.title) {
              await setGedChantier({
                id: ged.id,
                kind: ged.kind,
                chantierId: selectedChantier.id,
                chantier: selectedChantier.title,
              });
            }
          } else if (slotDest) {
            const row = paralleleItems.find((r) => r.id === slotDest.rowId);
            const isEmptyApresSlot =
              slotDest.slot === 2 && row && !row.idsource2 && !row.url2;
            if (isEmptyApresSlot) {
              idsource = slotDest.rowId;
              await setGedIdsource({ id: ged.id, kind: ged.kind, idsource });
              // Also update chantier if selected
              if (selectedChantier && selectedChantier.id && selectedChantier.title) {
                await setGedChantier({
                  id: ged.id,
                  kind: ged.kind,
                  chantierId: selectedChantier.id,
                  chantier: selectedChantier.title,
                });
              }
            } else {
              await moveGedToFolder(toMovePayload(ged));
              // Also update chantier if selected (moveGedToFolder only updates idsource)
              if (selectedChantier && selectedChantier.id && selectedChantier.title) {
                await setGedChantier({
                  id: ged.id,
                  kind: ged.kind,
                  chantierId: selectedChantier.id,
                  chantier: selectedChantier.title,
                });
              }
            }
          } else {
            await moveGedToFolder(toMovePayload(ged));
            // Also update chantier if selected (moveGedToFolder only updates idsource)
            if (selectedChantier && selectedChantier.id && selectedChantier.title) {
              await setGedChantier({
                id: ged.id,
                kind: ged.kind,
                chantierId: selectedChantier.id,
                chantier: selectedChantier.title,
              });
            }
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
      // Update only the specific GED that was dragged (slot 1 or slot 2), not both.
      if (slotSource && destination.droppableId === DROPPABLE_GEDS) {
        const row = paralleleItems.find((r) => r.id === slotSource.rowId);
        if (!row) return;

        setSlotUpdateInProgress(true);
        try {
          // idsource1 and idsource2 are NOT the GED id – we must fetch GEDs and find by URL to get the real GED id.
          // Then PUT geds/:realId?kind=...&idsource=00000000-0000-0000-0000-000000000000
          const slot = slotSource.slot;
          const rowKind = slot === 1 ? row.kind1 : row.kind2;
          const kind = rowKind ?? QUALIPHOTO_KIND;

          if (slot === 2) {
            const idsource = row.idsource2;
            if (!idsource) {
              console.warn('  No idsource2 found for slot 2');
            } else {
              let gedsInSlot2 = await getGeds({ kind, idsource, limit: 50 });
              let ged = findGedInSlot(gedsInSlot2, row, 2);
              if (!ged && kind !== QUALIPHOTO_KIND) {
                gedsInSlot2 = await getGeds({ kind: QUALIPHOTO_KIND, idsource, limit: 50 });
                ged = findGedInSlot(gedsInSlot2, row, 2);
              }
              if (ged) {
                await moveGedToMain({ id: ged.id, kind: ged.kind });
              } else {
                console.warn(`  Could not find GED matching slot 2 by URL (url2: ${row.url2})`);
              }
            }
          } else {
            const idsource = row.idsource1;
            if (!idsource) {
              console.warn('  No idsource1 found for slot 1');
            } else {
              let gedsInSlot1 = await getGeds({ kind, idsource, limit: 50 });
              let ged1 = findGedInSlot(gedsInSlot1, row, 1);
              if (!ged1 && kind !== QUALIPHOTO_KIND) {
                gedsInSlot1 = await getGeds({ kind: QUALIPHOTO_KIND, idsource, limit: 50 });
                ged1 = findGedInSlot(gedsInSlot1, row, 1);
              }
              if (!ged1 && folderId && idsource === folderId) {
                const folderGeds = await getGeds({ kind, idsource: folderId, limit: 100 });
                ged1 = findGedInSlot(folderGeds, row, 1);
                if (!ged1 && kind !== QUALIPHOTO_KIND) {
                  const folderGeds2 = await getGeds({ kind: QUALIPHOTO_KIND, idsource: folderId, limit: 100 });
                  ged1 = findGedInSlot(folderGeds2, row, 1);
                }
              }
              if (!ged1) {
                gedsInSlot1 = await getGeds({ kind, idsource: row.id, limit: 50 });
                ged1 = findGedInSlot(gedsInSlot1, row, 1);
              }
              if (ged1) {
                await moveGedToMain({ id: ged1.id, kind: ged1.kind });
              } else {
                console.warn(`  Could not find GED matching slot 1 by URL (url1: ${row.url1})`);
              }
            }
          }
          scheduleAfterDndCleanup(onMoveSuccess);
        } catch (err) {
          console.error('Failed to move GED from slot to main:', err);
          scheduleAfterDndCleanup(onMoveSuccess);
        } finally {
          setSlotUpdateInProgress(false);
        }
        return;
      }
    },
    [
      folderId,
      selectedChantier,
      leftImageItems,
      paralleleItems,
      moveGedToFolder,
      onMoveSuccess,
    ],
  );

  return { onDragEnd, slotUpdateInProgress };
}
