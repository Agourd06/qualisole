import { useCallback, useEffect, useState } from 'react';
import {
  getFolderImageOrder,
  getFolderImageOrderFromStorage,
  setFolderImageOrderInStorage,
  updateFolderImageOrder,
} from '../../../api/folders.api';

export interface UseFolderImageOrderResult {
  /** Ordered GED ids, or null if not loaded / no custom order. */
  order: string[] | null;
  /** Set order and persist (API + localStorage fallback). New items can be appended by caller. */
  setOrder: (orderedIds: string[]) => Promise<void>;
  /** True while saving order (e.g. after reorder). */
  isSaving: boolean;
  /** True on first load for this folder. */
  isLoading: boolean;
}

/**
 * Manages persistent image order for a folder: load from API (or localStorage fallback)
 * and save on reorder. Order is stable across refresh and navigation.
 */
export function useFolderImageOrder(
  folderId: string | null,
): UseFolderImageOrderResult {
  const [order, setOrderState] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!folderId) {
      setOrderState(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getFolderImageOrder(folderId)
      .then((apiOrder) => {
        if (cancelled) return;
        if (apiOrder != null && apiOrder.length > 0) {
          setOrderState(apiOrder);
        } else {
          const stored = getFolderImageOrderFromStorage(folderId);
          setOrderState(stored);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const stored = getFolderImageOrderFromStorage(folderId);
        setOrderState(stored);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  const setOrder = useCallback(
    async (orderedIds: string[]) => {
      if (!folderId || orderedIds.length === 0) return;
      setIsSaving(true);
      try {
        const ok = await updateFolderImageOrder(folderId, orderedIds);
        if (ok) {
          setOrderState(orderedIds);
        } else {
          setFolderImageOrderInStorage(folderId, orderedIds);
          setOrderState(orderedIds);
        }
      } catch {
        setFolderImageOrderInStorage(folderId, orderedIds);
        setOrderState(orderedIds);
      } finally {
        setIsSaving(false);
      }
    },
    [folderId],
  );

  return { order, setOrder, isSaving, isLoading };
}
