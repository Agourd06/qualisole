import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FolderType } from '../../../types/foldertypes.types';
import type { Folder } from '../../../types/folders.types';
import type { GedItem } from '../../ged/types/ged.types';
import { buildImageUrl, isImageUrl } from '../../ged/utils/qualiphotoHelpers';
import { getFolderTypeLabel } from '../utils/controlHelpers';
import { FullScreenImageZoom } from '../../../components/ui/FullScreenImageZoom';

interface ControlExecutionSectionProps {
  folderTypes: FolderType[];
  selectedFolderTypeId: string | null;
  selectedFolder: Folder | null;
  folderGeds: GedItem[];
  folderGedsLoading: boolean;
  folderGedsError: string | null;
  onOpenLongTextPreview: (title: string, text: string) => void;
  onExportPdf: () => void;
  exportingPdf: boolean;
  getUserDisplayName: (id: string | null | undefined) => string;
}

interface ControlGedRowProps {
  ged: GedItem;
  onOpenLongTextPreview: (title: string, text: string) => void;
  onOpenImage: (src: string, alt: string) => void;
}

const ControlGedRow: React.FC<ControlGedRowProps> = React.memo(
  function ControlGedRow({ ged, onOpenLongTextPreview, onOpenImage }) {
    const anyGed = ged as unknown as {
      answer?: string | number | null;
      quantity?: string | number | null;
      price?: string | number | null;
    };

    const answer = anyGed.answer ?? '—';
    const quantity = anyGed.quantity ?? '—';
    const price = anyGed.price ?? '—';
    const imageUrl =
      ged.url && isImageUrl(ged.url) ? buildImageUrl(ged) : null;
    const typeNorm = (ged.type || '').toLowerCase().trim();

    let answerNode: React.ReactNode;

    if (typeNorm === 'boolean') {
      const norm = String(answer).toLowerCase().trim();
      const truthy = ['1', 'true', 'yes', 'oui', 'vrai', 'y'].includes(norm);
      const falsy = ['0', 'false', 'no', 'non', 'faux', 'n'].includes(norm);
      if (truthy || falsy) {
        const isTrue = truthy;
        answerNode = (
          <span className="flex items-center justify-start pl-4">
            <span
              title={isTrue ? 'Oui' : 'Non'}
              className={`inline-block h-3.5 w-3.5 rounded-full shadow ${
                isTrue ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              aria-label={isTrue ? 'Oui' : 'Non'}
            />
          </span>
        );
      } else {
        answerNode = <span>{String(answer)}</span>;
      }
    } else if (typeNorm === 'taux') {
      answerNode = <span>{`${String(answer)} %`}</span>;
    } else if (typeNorm === 'photo') {
      answerNode = (
        <span className="text-xs font-medium tracking-wide text-neutral-600">
          Photo
        </span>
      );
    } else if (typeNorm === 'long_text') {
      const text = String(answer);
      const preview =
        text.length > 60 ? `${text.slice(0, 57)}…` : text || '—';
      answerNode = (
        <button
          type="button"
          onClick={() =>
            onOpenLongTextPreview(ged.title || 'Texte', text)
          }
          className="max-w-full truncate text-left text-primary font-medium underline-offset-2 hover:underline"
        >
          {preview}
        </button>
      );
    } else {
      answerNode = <span>{String(answer)}</span>;
    }

    return (
      <div
        key={ged.id}
        className="group relative odd:bg-white even:bg-neutral-50 hover:bg-primary/5 transition-colors duration-150"
      >
        <div className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] pl-5 pr-1 py-3 text-[0.85rem] text-neutral-800">
          <span className="pr-3 font-semibold text-neutral-900 truncate">
            {ged.title || '—'}
          </span>
          <span className="pr-3 truncate text-neutral-700 leading-relaxed">
            {answerNode}
          </span>
          <span className="text-right tabular-nums font-medium text-neutral-700">
            {String(quantity)}
          </span>
          <span className="text-right tabular-nums font-semibold text-neutral-900">
            {String(price)}
          </span>
          <span className="flex justify-end">
            {imageUrl ? (
              <button
                type="button"
                onClick={() =>
                  onOpenImage(imageUrl, ged.title || 'Photo')
                }
                className="ml-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1"
                aria-label="Afficher la photo en plein écran"
              >
                <img
                  src={imageUrl}
                  alt={ged.title || ''}
                  className="h-12 w-20 rounded-lg border border-neutral-200 object-cover shadow-sm hover:scale-[1.03] transition-transform duration-150"
                />
              </button>
            ) : (
              <span className="text-xs text-neutral-400 pr-8">—</span>
            )}
          </span>
        </div>
      </div>
    );
  },
);

export const ControlExecutionSection: React.FC<ControlExecutionSectionProps> =
  React.memo(function ControlExecutionSection({
    folderTypes,
    selectedFolderTypeId,
    selectedFolder,
    folderGeds,
    folderGedsLoading,
    folderGedsError,
    onOpenLongTextPreview,
    onExportPdf,
    exportingPdf,
    getUserDisplayName,
  }) {
    const { t } = useTranslation(['nav', 'controlPage']);

    const [fullscreenImage, setFullscreenImage] = React.useState<{
      src: string;
      alt: string;
    } | null>(null);

    const handleOpenImage = React.useCallback((src: string, alt: string) => {
      setFullscreenImage({ src, alt });
    }, []);

    const handleCloseImage = React.useCallback(() => {
      setFullscreenImage(null);
    }, []);

    const headerTitle = React.useMemo(() => {
      if (!selectedFolder) {
        return t('controlPage:executionTitleSimple', 'Exécution');
      }

      const selectedType = folderTypes.find(
        (ft) => String(ft.id) === String(selectedFolderTypeId),
      );
      const typeLabel = selectedType ? getFolderTypeLabel(selectedType) : '';
      const controleLabel =
        selectedFolder.title || selectedFolder.code || '—';
      const ownerName = getUserDisplayName(selectedFolder.owner_id);

      return t(
        'controlPage:executionTitle',
        'Exécution (Contrôle {{controle}} ({{type}}) · {{owner}})',
        {
          controle: controleLabel,
          type: typeLabel || '—',
          owner: ownerName || '—',
        },
      );
    }, [
      folderTypes,
      getUserDisplayName,
      selectedFolder,
      selectedFolderTypeId,
      t,
    ]);

    if (!selectedFolderTypeId) {
      return (
        <section
          className="flex flex-1 flex-col pr-8 sm:pr-12 lg:pr-16"
          aria-label={t('controlPage:gedsAria', 'GEDs in folder')}
        >
          <h2 className="mb-4 text-center text-lg font-semibold text-primary">
            {t('controlPage:executionTitleSimple', 'Exécution')}
          </h2>
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
            {t(
              'controlPage:selectFolderTypeFirst',
              'Select a control type and folder to see GEDs.',
            )}
          </div>
        </section>
      );
    }

    if (!selectedFolder) {
      return (
        <section
          className="flex flex-1 flex-col pr-8 sm:pr-12 lg:pr-16"
          aria-label={t('controlPage:gedsAria', 'GEDs in folder')}
        >
          <h2 className="mb-4 text-center text-lg font-semibold text-primary">
            {t('controlPage:executionTitleSimple', 'Exécution')}
          </h2>
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
            {t(
              'controlPage:selectFolderHint',
              'Choose a folder in the middle column to see its GEDs.',
            )}
          </div>
        </section>
      );
    }

    return (
      <section
        className="flex flex-1 flex-col pr-2 sm:pr-6 lg:pr-8"
        aria-label={t('controlPage:gedsAria', 'GEDs in folder')}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-primary">
            {headerTitle}
          </h2>
          {!folderGedsLoading &&
            !folderGedsError &&
            folderGeds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-neutral-700">
                  {folderGeds.length === 1
                    ? t('controlPage:gedCount_one', '1 GED')
                    : t('controlPage:gedCount_other', '{{count}} GEDs', {
                        count: folderGeds.length,
                      })}
                </span>
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={exportingPdf}
                  className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingPdf ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <>
                      <img
                        src="/pdf.png"
                        alt=""
                        className="h-3.5 w-3.5 object-contain"
                        aria-hidden
                      />
                      <span>PDF</span>
                    </>
                  )}
                </button>
              </div>
            )}
        </div>

        {folderGedsLoading ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/80 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
            {t('controlPage:loading', 'Loading…')}
          </div>
        ) : folderGedsError ? (
          <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700 shadow-sm">
            {folderGedsError === 'LOAD_ERROR'
              ? t('controlPage:loadError', 'Error while loading.')
              : folderGedsError}
          </div>
        ) : folderGeds.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
            {t(
              'controlPage:noGedsForFolder',
              'No GEDs in this folder yet.',
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,2.5fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] border-b border-neutral-300 bg-gradient-to-b from-neutral-50 to-neutral-100 px-5 py-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-neutral-600 backdrop-blur shadow-sm">
                <span>
                  {t('controlPage:gedTitleHeader', 'Title')}
                </span>
                <span>
                  {t('controlPage:gedAnswerHeader', 'Answer')}
                </span>
                <span className="text-right">
                  {t('controlPage:gedQuantityHeader', 'Quantity')}
                </span>
                <span className="text-right">
                  {t('controlPage:gedPriceHeader', 'Price')}
                </span>
                <span className="text-right">
                  {t('controlPage:gedImageHeader', 'Photo')}
                </span>
              </div>

              <div className="divide-y divide-neutral-100">
                {folderGeds.map((ged) => (
                  <ControlGedRow
                    key={ged.id}
                    ged={ged}
                    onOpenLongTextPreview={onOpenLongTextPreview}
                    onOpenImage={handleOpenImage}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {fullscreenImage && (
          <FullScreenImageZoom
            src={fullscreenImage.src}
            alt={fullscreenImage.alt}
            ariaLabel={t(
              'controlPage:fullscreenPhotoAria',
              'View photo in full screen',
            )}
            onClose={handleCloseImage}
          />
        )}
      </section>
    );
  });

