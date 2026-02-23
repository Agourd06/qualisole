import { useState, useCallback } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { setGedAssigned } from '../services/ged.service';
import { QUALIPHOTO_KIND } from '../constants';
import type { GedItem } from '../types/ged.types';

const DROPPABLE_LEFT = 'unassigned';
const DROPPABLE_RIGHT = 'assigned';

export interface UseAssignmentDragDropArgs {
  assignedToId: string | null;
  leftItems: GedItem[];
  rightItems: GedItem[];
  onMoveSuccess: () => void;
}

/** Defer so @hello-pangea/dnd can finish cleanup before we refetch (avoids "Unable to find draggable" warning). */
function scheduleAfterDndCleanup(fn: () => void | Promise<void>): void {
  setTimeout(() => { fn(); }, 0);
}

export function useAssignmentDragDrop({
  assignedToId,
  leftItems,
  rightItems,
  onMoveSuccess,
}: UseAssignmentDragDropArgs) {
  const [updateInProgress, setUpdateInProgress] = useState(false);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || !assignedToId) return;

      // Same position - no change
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const isFromLeft = source.droppableId === DROPPABLE_LEFT;
      const isToRight = destination.droppableId === DROPPABLE_RIGHT;

      // Left → Right: assign GED to user
      if (isFromLeft && isToRight) {
        const rawId = String(draggableId).replace(/^left-/, '');
        const ged = leftItems.find((g) => g.id === rawId);
        if (!ged) return;

        setUpdateInProgress(true);
        try {
          await setGedAssigned({
            id: ged.id,
            kind: ged.kind || QUALIPHOTO_KIND,
            assigned: assignedToId,
          });
          scheduleAfterDndCleanup(onMoveSuccess);
        } catch (error) {
          console.error('Failed to assign GED:', error);
          scheduleAfterDndCleanup(onMoveSuccess);
        } finally {
          setUpdateInProgress(false);
        }
        return;
      }

      // Right → Left: unassign GED from user
      if (!isFromLeft && destination.droppableId === DROPPABLE_LEFT) {
        const rawId = String(draggableId).replace(/^right-/, '');
        const ged = rightItems.find((g) => g.id === rawId);
        if (!ged) return;

        setUpdateInProgress(true);
        try {
          await setGedAssigned({
            id: ged.id,
            kind: ged.kind || QUALIPHOTO_KIND,
            assigned: null,
          });
          scheduleAfterDndCleanup(onMoveSuccess);
        } catch (error) {
          console.error('Failed to unassign GED:', error);
          scheduleAfterDndCleanup(onMoveSuccess);
        } finally {
          setUpdateInProgress(false);
        }
        return;
      }
    },
    [assignedToId, leftItems, rightItems, onMoveSuccess],
  );

  return {
    onDragEnd,
    updateInProgress,
  };
}
