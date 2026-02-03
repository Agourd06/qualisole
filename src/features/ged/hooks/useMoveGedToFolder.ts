import { useCallback, useState } from 'react';
import { moveGedToFolder as moveGedToFolderService } from '../services/ged.service';
import type { GedMovePayload } from '../services/ged.service';

export interface UseMoveGedToFolderOptions {
  folderId: string | null;
  /** Called after move API succeeds; await this to refresh data before allowing new interactions. */
  onSuccess?: () => void | Promise<void>;
}

export interface UseMoveGedToFolderResult {
  moveGedToFolder: (payload: GedMovePayload) => Promise<boolean>;
  isMoving: boolean;
  moveError: string | null;
  clearMoveError: () => void;
}

/**
 * Hook to move a GED to a folder (update idsource). Refetch callbacks should be passed via onSuccess.
 */
export function useMoveGedToFolder({
  folderId,
  onSuccess,
}: UseMoveGedToFolderOptions): UseMoveGedToFolderResult {
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const moveGedToFolder = useCallback(
    async (payload: GedMovePayload): Promise<boolean> => {
      if (!folderId) return false;
      setIsMoving(true);
      setMoveError(null);
      try {
        await moveGedToFolderService(payload, folderId);
        if (onSuccess) await onSuccess();
        return true;
      } catch (err) {
        setMoveError(err instanceof Error ? err.message : 'Move failed');
        return false;
      } finally {
        setIsMoving(false);
      }
    },
    [folderId, onSuccess],
  );

  const clearMoveError = useCallback(() => setMoveError(null), []);

  return { moveGedToFolder, isMoving, moveError, clearMoveError };
}
