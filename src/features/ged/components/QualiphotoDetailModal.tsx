import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichTextEditor } from '../../../components/inputs/RichTextEditor';
import { useTranslation } from 'react-i18next';
import { getStoredAuth } from '../../../utils/authStorage';
import { updateGed } from '../services/ged.service';
import { generateQualiphotoPdf } from '../utils/qualiphotoPdf';
import { getMediaType } from '../utils/qualiphotoHelpers';
import { useAssociatedGeds } from '../hooks/useAssociatedGeds';
import { AssociatedGedsList } from './AssociatedGedsList';
import type { GedItem } from '../types/ged.types';

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

export interface QualiphotoDetailModalProps {
  ged: GedItem | null;
  imageUrl: string;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh the list. */
  onSaved?: () => void;
}

/**
 * Professional inspection report viewer: two-column layout (image | text),
 * editable title and description, Save/Reset at bottom.
 */
export const QualiphotoDetailModal: React.FC<QualiphotoDetailModalProps> = ({
  ged,
  imageUrl,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation('qualiphotoModal');

  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [titleEditEnabled, setTitleEditEnabled] = useState(false);
  const [descriptionEditEnabled, setDescriptionEditEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const syncFromGed = useCallback((item: GedItem | null) => {
    if (!item) return;
    setTitleValue(item.title ?? '');
    setDescriptionValue(item.description ?? '');
    setTitleEditEnabled(false);
    setDescriptionEditEnabled(false);
    setSaveError(null);
    setEditorKey((k) => k + 1);
  }, []);

  useEffect(() => {
    syncFromGed(ged);
  }, [ged, syncFromGed]);

  useEffect(() => {
    if (!isImageFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isImageFullscreen]);

  const handleSave = async () => {
    if (!ged) return;
    const hasTitle = titleValue != null && titleValue.trim() !== '';
    const hasDescription = descriptionValue != null && descriptionValue.trim() !== '';
    if (!hasTitle && !hasDescription) {
      setSaveError(t('saveError'));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateGed({
        id: ged.id,
        kind: ged.kind,
        idsource: ged.idsource,
        ...(hasTitle && { title: titleValue }),
        ...(hasDescription && { description: descriptionValue }),
      });
      onSaved?.();
      setTitleEditEnabled(false);
      setDescriptionEditEnabled(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    syncFromGed(ged);
  };

  const handleGeneratePdf = async () => {
    if (!ged) return;
    setPdfGenerating(true);
    setSaveError(null);
    try {
      let imageDataUrl: string | null = null;
      const mediaType = getMediaType(ged.url);
      if (mediaType === 'image') {
        try {
          const { token } = getStoredAuth();
          const res = await fetch(imageUrl, {
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
          // PDF will be generated without image if fetch fails (e.g. CORS)
        }
      }
      // For video/audio, imageDataUrl stays null; PDF shows title/author/description only
      const photoDate = formatDisplayDate(ged.created_at);
      await generateQualiphotoPdf(
        {
          title: titleValue.trim() || t('defaultTitle'),
          author: ged.author,
          publishedDate: photoDate,
          description: descriptionValue || '',
          imageDataUrl,
        },
        `qualiphoto-${ged.id}.pdf`
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setPdfGenerating(false);
    }
  };

  const { items: associatedGeds, loading: associatedLoading, error: associatedError } =
    useAssociatedGeds(ged?.id ?? null, ged?.kind ?? '');

  const associatedOnlyThisGed = useMemo(() => {
    if (!ged) return [];
    const selectedIdNorm = String(ged.id).toLowerCase().trim();
    return associatedGeds.filter(
      (item) =>
        item.idsource != null &&
        item.idsource !== '' &&
        String(item.idsource).toLowerCase().trim() === selectedIdNorm,
    );
  }, [ged, associatedGeds]);

  if (!ged) return null;

  const photoDate = formatDisplayDate(ged.created_at);
  const cardTitle = titleValue.trim() || t('defaultTitle');
  const mediaType = getMediaType(ged.url);
  const isImage = mediaType === 'image';
  const isVideo = mediaType === 'video';
  const isAudio = mediaType === 'audio';

  return (
    <Modal open={!!ged} onClose={onClose} titleId="qualiphoto-detail-title">
      <div className="mx-auto flex max-h-[90vh] w-full max-w-4xl flex-col bg-neutral-50/80">
        {/* Sticky header – close only (space freed) */}
        <header className="sticky top-0 z-10 flex items-center justify-end border-b border-neutral-200/60 bg-white/95 px-6 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={t('closeAria')}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        {/* Content: two columns on desktop, stacked on mobile */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row">
            {/* Left column – Media zone (40%): image, video, or audio */}
            <div className="shrink-0 lg:w-[40%] lg:min-w-0 p-6">
              <div className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="inline-flex rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700"
                    aria-hidden
                  >
                    {isImage && t('mediaTypeImage')}
                    {isVideo && t('mediaTypeVideo')}
                    {isAudio && t('mediaTypeAudio')}
                  </span>
                </div>
                <div className="group relative flex w-full aspect-[4/3] min-h-[200px] items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                  {isImage && (
                    <button
                      type="button"
                      onClick={() => setIsImageFullscreen(true)}
                      className="absolute inset-0 flex cursor-zoom-in items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded-xl"
                      aria-label={t('enlargeImageAria')}
                    >
                      <img
                        src={imageUrl}
                        alt={cardTitle}
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    </button>
                  )}
                  {isVideo && (
                    <video
                      src={imageUrl}
                      controls
                      playsInline
                      className="max-h-full max-w-full object-contain"
                      aria-label={cardTitle}
                    />
                  )}
                  {isAudio && (
                    <div className="flex w-full flex-col items-center justify-center gap-4 p-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      <audio
                        src={imageUrl}
                        controls
                        className="w-full max-w-sm"
                        aria-label={cardTitle}
                      />
                      <div className="flex w-full max-w-sm justify-between gap-2 text-xs text-neutral-600">
                        <span className="truncate">{ged.author || '—'}</span>
                        <span className="shrink-0 tabular-nums">{photoDate}</span>
                      </div>
                    </div>
                  )}
                  {/* Overlay: author & date (for image/video; audio has its own layout) */}
                  {!isAudio && (
                    <div
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-8 pb-3 px-5 pointer-events-none rounded-b-xl"
                      aria-hidden
                    >
                      <div className="flex justify-between items-center gap-4">
                        <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-white opacity-95 drop-shadow-lg">
                          {ged.author || '—'}
                        </span>
                        <span className="shrink-0 tabular-nums text-[0.8125rem] font-medium text-white/90 drop-shadow-lg">
                          {photoDate}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fullscreen image overlay (image only) */}
            {isImage && isImageFullscreen && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
                role="dialog"
                aria-modal="true"
                aria-label={t('fullscreenAria')}
              >
                <button
                  type="button"
                  onClick={() => setIsImageFullscreen(false)}
                  className="absolute inset-0 cursor-default"
                  aria-hidden
                />
                <img
                  src={imageUrl}
                  alt={cardTitle}
                  className="relative z-10 max-h-full max-w-full cursor-zoom-out object-contain"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageFullscreen(false);
                  }}
                  draggable={false}
                />
                <button
                  type="button"
                  onClick={() => setIsImageFullscreen(false)}
                  className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label={t('closeAria')}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Right column – Title and description only (60%) */}
            <div className="flex flex-1 min-w-0 flex-col border-t border-neutral-200/60 lg:border-t-0 lg:border-l lg:border-neutral-200/60 p-6">
              {/* Title – input with update icon on the right */}
              <section className="mb-5">
                <div className="flex items-center gap-2 rounded-xl border-2 border-neutral-200 bg-white shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    disabled={!titleEditEnabled}
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[0.9375rem] font-medium text-neutral-800 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-600 focus:outline-none focus:ring-0"
                    placeholder={t('defaultTitle')}
                    aria-label={t('titleLabel')}
                  />
                  <button
                    type="button"
                    onClick={() => setTitleEditEnabled((e) => !e)}
                    className="shrink-0 rounded-r-xl p-3 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={t('updateAria')}
                    title={t('updateAria')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </section>

              {/* Description – rich text editor (no label/icon) */}
              <section className="flex flex-1 flex-col min-h-0">
                <div className="min-h-[200px] flex-1 min-w-0">
                  <RichTextEditor
                    key={`${ged.id}-${editorKey}`}
                    value={descriptionValue}
                    onChange={setDescriptionValue}
                    placeholder={t('noDescription')}
                    rows={6}
                    readOnly={!descriptionEditEnabled}
                    showCharCount={true}
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Associated GEDs (idsource = this GED's id) – below main content, above footer */}
          <AssociatedGedsList
            items={associatedOnlyThisGed}
            loading={associatedLoading}
            error={associatedError}
            title={t('associatedGedsTitle')}
          />
        </div>

        {/* Fixed bottom – Save & Reset */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/60 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            {saveError && (
              <p className="text-sm text-red-600" role="alert">
                {saveError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={pdfGenerating || saving}
              className="rounded-xl border-2 border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {pdfGenerating ? t('generatingPdf') : t('generatePdf')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-xl border-2 border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {t('reset')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};
