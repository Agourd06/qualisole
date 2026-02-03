import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import { QualiphotoCard } from './QualiphotoGallerySection';
import { buildImageUrl } from '../utils/qualiphotoHelpers';
import { filterFolderImageGeds } from '../utils/folderGedFilter';
import { generateFolderGedsTablePdf } from '../utils/qualiphotoPdf';
import { getStoredAuth } from '../../../utils/authStorage';
import { QUALIPHOTO_ITEMS_PER_PAGE } from '../constants';
import type { GedItem } from '../types/ged.types';

const DROPPABLE_RIGHT = 'assigned';

export interface FolderInfo {
  id: string;
  title: string | null;
}

export interface QualiphotoFolderPanelProps {
  selectedFolder: FolderInfo | null;
  folderItems: GedItem[];
  folderLoading: boolean;
  folderError: string | null;
  moveError: string | null;
  clearMoveError: () => void;
  isAssigning: boolean;
  onSelectGed: (ged: GedItem) => void;
}

/**
 * Right side: chantier/folder panel. Shows only GEDs that belong to the selected folder
 * (idsource === folder id). PDF generation uses the same filter so the export is folder-scoped only.
 */
export const QualiphotoFolderPanel: React.FC<QualiphotoFolderPanelProps> = ({
  selectedFolder,
  folderItems,
  folderLoading,
  folderError,
  moveError,
  clearMoveError,
  isAssigning,
  onSelectGed,
}) => {
  const { t } = useTranslation('qualiphotoPage');
  const [rightPage, setRightPage] = useState(1);

  const folderId = selectedFolder?.id ?? null;
  const rightImageItems = useMemo(
    () => filterFolderImageGeds(folderItems, folderId),
    [folderItems, folderId],
  );

  const rightTotalPages = Math.max(
    1,
    Math.ceil(rightImageItems.length / QUALIPHOTO_ITEMS_PER_PAGE),
  );
  const rightPaginated = useMemo(
    () =>
      rightImageItems.slice(
        (rightPage - 1) * QUALIPHOTO_ITEMS_PER_PAGE,
        rightPage * QUALIPHOTO_ITEMS_PER_PAGE,
      ),
    [rightImageItems, rightPage],
  );

  useEffect(() => setRightPage(1), [folderId, rightImageItems.length]);

  const [folderPdfGenerating, setFolderPdfGenerating] = useState(false);
  const handleGenerateFolderPdf = useCallback(async () => {
    if (!selectedFolder || folderPdfGenerating || !folderId) return;
    const imageGeds = filterFolderImageGeds(folderItems, folderId);
    if (imageGeds.length === 0) return;
    setFolderPdfGenerating(true);
    try {
      const { token } = getStoredAuth();
      const rows = await Promise.all(
        imageGeds.map(async (ged) => {
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
          };
        }),
      );
      const safeName = (selectedFolder.title || 'folder').replace(/[^\w\-]/g, '_');
      await generateFolderGedsTablePdf(
        selectedFolder.title ?? 'Folder',
        rows,
        `folder-${safeName}-${Date.now()}.pdf`,
      );
    } finally {
      setFolderPdfGenerating(false);
    }
  }, [selectedFolder, folderId, folderItems, folderPdfGenerating]);

  if (!selectedFolder) {
    return (
      <aside
        className="flex shrink-0 flex-col pr-8 sm:pr-12 lg:pr-16"
        style={{ width: '33vw' }}
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
            rightPaginated.map((ged, index) => (
              <Draggable
                key={ged.id}
                draggableId={ged.id}
                index={index}
                isDragDisabled={true}
              >
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps}>
                    <QualiphotoCard
                      imageUrl={buildImageUrl(ged)}
                      title={ged.title || t('noTitle')}
                      author={ged.author}
                      chantier={ged.chantier ?? ged.categorie}
                      createdAt={ged.created_at}
                      onClick={() => onSelectGed(ged)}
                    />
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

  const renderPagination = () =>
    rightTotalPages > 1 ? (
      <nav
        className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200/40 bg-white/60 px-5 py-4 backdrop-blur-sm"
        aria-label={t('paginationAria')}
      >
        <span className="text-sm font-medium text-neutral-600">
          {t('pageOf')} {rightPage} / {rightTotalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRightPage((p) => Math.max(1, p - 1))}
            disabled={rightPage <= 1}
            className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('previous')}
          </button>
          <button
            type="button"
            onClick={() => setRightPage((p) => Math.min(rightTotalPages, p + 1))}
            disabled={rightPage >= rightTotalPages}
            className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      </nav>
    ) : null;

  return (
    <aside
      className="flex shrink-0 flex-col pr-8 sm:pr-12 lg:pr-16"
      style={{ width: '33vw' }}
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <p
          className="min-w-0 truncate text-xs font-medium text-neutral-600"
          title={selectedFolder.title ?? undefined}
        >
          <span className="text-neutral-800">{selectedFolder.title ?? '—'}</span>
          <span className="ml-1.5 text-neutral-500">
            · {t('imageCount', { count: rightImageItems.length })}
          </span>
        </p>
        <button
          type="button"
          onClick={handleGenerateFolderPdf}
          disabled={folderPdfGenerating || rightImageItems.length === 0}
          className="shrink-0 rounded bg-[rgb(0,82,155)] px-2 py-1 text-xs font-medium text-white hover:bg-[rgb(0,70,135)] disabled:opacity-50"
          aria-label={t('generateFolderPdf')}
        >
          {folderPdfGenerating ? t('generatingPdf') : t('generateFolderPdf')}
        </button>
      </div>
      <div>{renderRightContent()}</div>
      {!folderLoading &&
        !folderError &&
        rightImageItems.length > 0 &&
        renderPagination()}
    </aside>
  );
};
