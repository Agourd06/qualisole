import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import { QualiphotoCard } from './QualiphotoGallerySection';
import { FolderEditModal } from './FolderEditModal';
import { buildImageUrl, formatDisplayDate, isVideoUrl, isAudioUrl } from '../utils/qualiphotoHelpers';
import { filterFolderImageGeds } from '../utils/folderGedFilter';
import { generateFolderGedsTablePdf } from '../utils/qualiphotoPdf';
import { generateFolderGedsTableWord } from '../utils/qualiphotoWord';
import { getStoredAuth } from '../../../utils/authStorage';
import type { GedItem } from '../types/ged.types';

const DROPPABLE_RIGHT = 'assigned';

export interface FolderInfo {
  id: string;
  title: string | null;
  description?: string | null;
  conclusion?: string | null;
}

export interface QualiphotoFolderPanelProps {
  selectedFolder: FolderInfo | null;
  /** Chantier (project) name for display in header. */
  chantierTitle?: string | null;
  /** Folder items in display order (already ordered by saved order). */
  orderedFolderItems: GedItem[];
  folderLoading: boolean;
  folderError: string | null;
  moveError: string | null;
  clearMoveError: () => void;
  isAssigning: boolean;
  onSelectGed: (ged: GedItem) => void;
  /** Refetch folder GEDs only (right panel). */
  onRefetchFolder?: () => void | Promise<void>;
}

/**
 * Right side: chantier/folder panel. Shows only GEDs that belong to the selected folder
 * (idsource === folder id). PDF generation uses the same filter so the export is folder-scoped only.
 */
export const QualiphotoFolderPanel: React.FC<QualiphotoFolderPanelProps> = ({
  selectedFolder,
  chantierTitle,
  orderedFolderItems,
  folderLoading,
  folderError,
  moveError,
  clearMoveError,
  isAssigning,
  onSelectGed,
  onRefetchFolder,
}) => {
  const { t } = useTranslation('qualiphotoPage');

  const [folderMetaTitle, setFolderMetaTitle] = useState<string | null>(
    selectedFolder?.title ?? null,
  );
  const [folderMetaDescription, setFolderMetaDescription] = useState<string | null>(
    selectedFolder?.description ?? null,
  );
  const [folderMetaConclusion, setFolderMetaConclusion] = useState<string | null>(
    selectedFolder?.conclusion ?? null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const folderId = selectedFolder?.id ?? null;
  const rightImageItems = useMemo(
    () => filterFolderImageGeds(orderedFolderItems, folderId),
    [orderedFolderItems, folderId],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const previousIdsRef = useRef<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    previousIdsRef.current = new Set();
  }, [folderId]);

  useEffect(() => {
    const currentIds = new Set(rightImageItems.map((i) => i.id));
    const added = [...currentIds].filter((id) => !previousIdsRef.current.has(id));
    if (added.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        added.forEach((id) => next.add(id));
        return next;
      });
    }
    previousIdsRef.current = currentIds;
  }, [rightImageItems]);

  const selectedForPdf = useMemo(
    () => rightImageItems.filter((ged) => selectedIds.has(ged.id)),
    [rightImageItems, selectedIds],
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected =
    rightImageItems.length > 0 && selectedIds.size === rightImageItems.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rightImageItems.map((i) => i.id)));
    }
  }, [allSelected, rightImageItems]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  useEffect(() => {
    setFolderMetaTitle(selectedFolder?.title ?? null);
    setFolderMetaDescription(selectedFolder?.description ?? null);
    setFolderMetaConclusion(selectedFolder?.conclusion ?? null);
  }, [selectedFolder]);

  const [folderPdfGenerating, setFolderPdfGenerating] = useState(false);
  const [folderWordGenerating, setFolderWordGenerating] = useState(false);

  const buildRowsForExport = useCallback(async () => {
    const { token } = getStoredAuth();
    return Promise.all(
      selectedForPdf.map(async (ged) => {
        let imageDataUrl: string | null = null;
        try {
          const url = buildImageUrl(ged);
          const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const blob = await res.blob();
            imageDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          // leave null
        }
        return {
          title: ged.title ?? '',
          description: ged.description ?? '',
          imageDataUrl,
          author: ged.author ?? null,
          publishedDate: formatDisplayDate(ged.created_at),
        };
      }),
    );
  }, [selectedForPdf]);

  const handleGenerateFolderPdf = useCallback(async () => {
    if (!selectedFolder || folderPdfGenerating || !folderId) return;
    if (selectedForPdf.length === 0) return;
    setFolderPdfGenerating(true);
    try {
      const rows = await buildRowsForExport();
      const safeName = ((folderMetaTitle ?? selectedFolder.title) || 'folder').replace(
        /[^\w\-]/g,
        '_',
      );
      await generateFolderGedsTablePdf(
        folderMetaTitle ?? selectedFolder.title ?? 'Folder',
        rows,
        `folder-${safeName}-${Date.now()}.pdf`,
        {
          introduction: folderMetaDescription ?? selectedFolder.description ?? null,
          conclusion: folderMetaConclusion ?? selectedFolder.conclusion ?? null,
        },
      );
    } finally {
      setFolderPdfGenerating(false);
    }
  }, [
    selectedFolder,
    folderId,
    selectedForPdf.length,
    folderPdfGenerating,
    folderMetaTitle,
    folderMetaDescription,
    folderMetaConclusion,
    buildRowsForExport,
  ]);

  const handleGenerateFolderWord = useCallback(async () => {
    if (!selectedFolder || folderWordGenerating || !folderId) return;
    if (selectedForPdf.length === 0) return;
    setFolderWordGenerating(true);
    try {
      const rows = await buildRowsForExport();
      const safeName = ((folderMetaTitle ?? selectedFolder.title) || 'folder').replace(
        /[^\w\-]/g,
        '_',
      );
      await generateFolderGedsTableWord(
        folderMetaTitle ?? selectedFolder.title ?? 'Folder',
        rows,
        `folder-${safeName}-${Date.now()}.docx`,
        {
          introduction: folderMetaDescription ?? selectedFolder.description ?? null,
          conclusion: folderMetaConclusion ?? selectedFolder.conclusion ?? null,
        },
      );
    } finally {
      setFolderWordGenerating(false);
    }
  }, [
    selectedFolder,
    folderId,
    selectedForPdf.length,
    folderWordGenerating,
    folderMetaTitle,
    folderMetaDescription,
    folderMetaConclusion,
    buildRowsForExport,
  ]);

  if (!selectedFolder) {
    return (
      <aside
        className="flex shrink-0 flex-col pr-8 sm:pr-12 lg:pr-16"
        style={{ width: '47vw' }}
        aria-label={t('galleryAria')}
      >
        <div className="rounded-2xl bg-white/50 px-8 py-16 text-center text-sm text-neutral-500 backdrop-blur-sm">
          {t('selectFolderToSeeGeds')}
        </div>
      </aside>
    );
  }

  const isAnyPending = isAssigning;

  const renderRightContent = () => (
    <Droppable droppableId={DROPPABLE_RIGHT}>
      {(provided, snapshot) => (
        <section
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col gap-3 min-h-[220px] rounded-xl p-1 transition-colors ${
            snapshot.isDraggingOver ? 'ring-2 ring-primary bg-primary/10' : ''
          } ${isAnyPending ? 'opacity-60 pointer-events-none' : ''}`}
          aria-label={t('galleryAria')}
        >
          {folderLoading ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/50 py-16 text-center text-sm text-neutral-500">
              {t('loading')}
            </div>
          ) : folderError ? (
            <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700">
              {folderError === 'LOAD_ERROR' ? t('loadError') : folderError}
            </div>
          ) : rightImageItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 py-12 text-center text-sm text-neutral-500">
              <p>{t('noImages')}</p>
              <p className="mt-1 font-medium text-neutral-600">{t('dropHere')}</p>
            </div>
          ) : (
            rightImageItems.map((ged, index) => (
              <Draggable
                key={ged.id}
                draggableId={ged.id}
                index={index}
                isDragDisabled={isAnyPending}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`flex items-start gap-3 rounded-2xl border-b border-neutral-200 pb-3 last:border-b-0 last:pb-0 transition-shadow ${
                      snapshot.isDragging ? 'shadow-lg z-10 bg-white rounded-2xl' : ''
                    }`}
                  >
                    <label className="flex shrink-0 items-center pt-2 cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 rounded">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ged.id)}
                        onChange={() => toggleSelection(ged.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/20"
                        aria-label={t('selectImageAria', { title: ged.title || t('noTitle') })}
                      />
                    </label>
                    <div
                      {...provided.dragHandleProps}
                      className="flex shrink-0 cursor-grab active:cursor-grabbing touch-none p-2 -m-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                      aria-label={t('reorderImageAria')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <QualiphotoCard
                        imageUrl={buildImageUrl(ged)}
                        title={ged.title || t('noTitle')}
                        description={ged.description ?? ''}
                        author={ged.author}
                        chantier={ged.chantier ?? ged.categorie}
                        createdAt={ged.created_at}
                        layout="split"
                        onClick={() => onSelectGed(ged)}
                        isVideo={isVideoUrl(ged.url)}
                        isAudio={isAudioUrl(ged.url)}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))
          )}
          {provided.placeholder}
        </section>
      )}
    </Droppable>
  );

  return (
    <aside
      className="flex shrink-0 flex-col pr-8 sm:pr-12 lg:pr-16"
      style={{ width: '47vw' }}
      aria-label={t('galleryAria')}
    >
      {moveError && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{moveError}</span>
          <button type="button" onClick={clearMoveError} className="shrink-0 underline">
            {t('dismiss')}
          </button>
        </div>
      )}
      {isAssigning && (
        <p className="mb-2 text-xs text-neutral-500">{t('moving')}</p>
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-2">
          {rightImageItems.length > 0 ? (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                ref={selectAllCheckboxRef}
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/20"
                aria-label={allSelected ? t('deselectAll') : t('selectAll')}
              />
              <span className="text-xs font-medium text-neutral-600 whitespace-nowrap">
                {allSelected ? t('deselectAll') : t('selectAll')}
                <span className="ml-1 text-neutral-400">
                  ({t('selectedCount', { count: selectedIds.size })} / {rightImageItems.length})
                </span>
              </span>
            </label>
          ) : selectedFolder ? (
            <p className="text-xs font-medium text-neutral-600">
              <span className="text-neutral-800">{folderMetaTitle ?? selectedFolder.title ?? '—'}</span>
              <span className="ml-1.5 text-neutral-500">· {t('imageCount', { count: 0 })}</span>
            </p>
          ) : null}
        </div>
        {(chantierTitle || selectedFolder?.title) && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20 px-4 py-2 text-center">
              <p className="text-sm font-semibold text-primary truncate">
                {chantierTitle && <span>{chantierTitle}</span>}
                {chantierTitle && selectedFolder?.title && (
                  <span className="mx-2 text-primary/70">·</span>
                )}
                {selectedFolder?.title && (
                  <span className="text-primary/90">{folderMetaTitle ?? selectedFolder.title}</span>
                )}
              </p>
            </div>
            {onRefetchFolder && (
              <button
                type="button"
                onClick={() => onRefetchFolder()}
                disabled={folderLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-primary hover:text-primary disabled:opacity-50"
                aria-label={t('refreshFolderGeds')}
                title={t('refreshFolderGeds')}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={t('editFolderAria')}
            title={t('editFolderAria')}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerateFolderWord}
            disabled={folderWordGenerating || selectedForPdf.length === 0}
            className="flex h-8 items-center gap-1.5 rounded border border-neutral-200 bg-white px-2 py-1 transition-colors hover:bg-blue-50 hover:border-blue-200 disabled:opacity-50"
            aria-label={t('generateFolderWord')}
            title={
              selectedForPdf.length === 0
                ? t('selectAtLeastOneForPdf')
                : undefined
            }
          >
            <img src="/word.png" alt="" className="h-4 w-4 object-contain" aria-hidden />
            {folderWordGenerating ? t('generatingWord') : t('generateFolderWord')}
          </button>
          <button
            type="button"
            onClick={handleGenerateFolderPdf}
            disabled={folderPdfGenerating || selectedForPdf.length === 0}
            className="flex h-8 items-center gap-1.5 rounded border border-neutral-200 bg-white px-2 py-1 transition-colors hover:bg-red-50 hover:border-red-200 disabled:opacity-50"
            aria-label={t('generateFolderPdf')}
            title={
              selectedForPdf.length === 0
                ? t('selectAtLeastOneForPdf')
                : undefined
            }
          >
            <img src="/pdf.png" alt="" className="h-4 w-4 object-contain" aria-hidden />
            {folderPdfGenerating ? t('generatingPdf') : t('generateFolderPdf')}
          </button>
          </div>
        </div>
      </div>
      <div>{renderRightContent()}</div>

      {selectedFolder && (
        <FolderEditModal
          open={isEditModalOpen}
          folderId={selectedFolder.id}
          initialTitle={folderMetaTitle ?? selectedFolder.title ?? ''}
          initialDescription={folderMetaDescription ?? selectedFolder.description ?? null}
          initialConclusion={folderMetaConclusion ?? selectedFolder.conclusion ?? null}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(payload) => {
            if (payload.title) setFolderMetaTitle(payload.title);
            if (payload.description !== undefined) {
              setFolderMetaDescription(payload.description);
            }
            if (payload.conclusion !== undefined) {
              setFolderMetaConclusion(payload.conclusion);
            }
          }}
        />
      )}
    </aside>
  );
};
