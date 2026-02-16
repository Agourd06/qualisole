import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichTextEditor } from '../../../components/inputs/RichTextEditor';
import { useTranslation } from 'react-i18next';
import { getStoredAuth } from '../../../utils/authStorage';
import { updateGed } from '../services/ged.service';
import { generateQualiphotoPdf } from '../utils/qualiphotoPdf';
import { getMediaType } from '../utils/qualiphotoHelpers';
import { useAssociatedGeds } from '../hooks/useAssociatedGeds';
import { AssociatedGedsList } from './AssociatedGedsList';
import { FullScreenImageZoom } from '../../../components/ui/FullScreenImageZoom';
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
  /** Called after a successful save; pass updated fields so parent can update selected GED and refresh the list. */
  onSaved?: (updates: Partial<Pick<GedItem, 'title' | 'description'>>) => void;
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
  /** Skip the next sync after save so we don't overwrite the form (avoids rollback with RichTextEditor). */
  const skipNextSyncRef = useRef(false);

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
    if (skipNextSyncRef.current && ged) {
      skipNextSyncRef.current = false;
      return;
    }
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
      onSaved?.({
        title: hasTitle ? titleValue.trim() : ged.title ?? undefined,
        description: hasDescription ? (descriptionValue ?? '') : ged.description ?? undefined,
      });
      skipNextSyncRef.current = true;
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
    <Modal
      open={!!ged}
      onClose={onClose}
      titleId="qualiphoto-detail-title"
      contentClassName="relative z-10 w-[90vw] min-h-[88vh] max-h-[92vh] overflow-auto rounded-2xl bg-white shadow-2xl focus:outline-none"
    >
      <div className="flex min-h-[88vh] w-full flex-col bg-neutral-50/80">
        {/* Very top: title input row + close button */}
        <header className="sticky top-0 z-10 flex w-full items-center gap-3 border-b border-primary/20 bg-white/95 px-4 py-3 backdrop-blur-sm">
          <div className="min-w-0 flex-1 flex items-center gap-2 rounded-xl border-2 border-primary/70 bg-white shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              disabled={!titleEditEnabled}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-center text-[0.9375rem] font-medium text-neutral-800 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-600 focus:outline-none focus:ring-0"
              placeholder={t('defaultTitle')}
              aria-label={t('titleLabel')}
            />
            <button
              type="button"
              onClick={() => setTitleEditEnabled((e) => !e)}
              className="shrink-0 rounded-r-xl p-3 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={t('updateAria')}
              title={t('updateAria')}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t('closeAria')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Main content: image 45% | gap 10% | description 45% – same top/bottom alignment */}
          <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-stretch md:gap-[10%] md:px-8 md:py-6 md:min-h-[420px]">
            {/* Media – 45% width, stretches to match description height */}
            <section className="flex w-full flex-col md:w-[45%] md:shrink-0 md:min-h-0">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className="inline-flex rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700"
                aria-hidden
              >
                {isImage && t('mediaTypeImage')}
                {isVideo && t('mediaTypeVideo')}
                {isAudio && t('mediaTypeAudio')}
              </span>
            </div>
            <div className="group relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-neutral-100 shadow-sm">
                {isImage && (
                  <button
                    type="button"
                    onClick={() => setIsImageFullscreen(true)}
                    className="flex h-full w-full cursor-zoom-in items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
                    aria-label={t('enlargeImageAria')}
                  >
                    <img
                      src={imageUrl}
                      alt={cardTitle}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                )}
                {isVideo && (
                  <div className="flex h-full w-full flex-col">
                    <video
                      src={imageUrl}
                      controls
                      playsInline
                      className="h-full w-full rounded-b-xl object-cover bg-neutral-900 shadow-md"
                      aria-label={cardTitle}
                    />
                    <div className="flex justify-between items-center gap-2 px-4 py-2 text-xs text-neutral-600 bg-white/80">
                      <span className="min-w-0 truncate font-medium">{ged.author || '—'}</span>
                      <span className="shrink-0 tabular-nums">{photoDate}</span>
                    </div>
                  </div>
                )}
                {isAudio && (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
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
                {isImage && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-8 pb-3 px-5 pointer-events-none"
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
            </section>

          {/* Description – 45% width, stretches to match image height */}
          <section className="flex w-full flex-col md:w-[45%] md:shrink-0 md:min-h-0">
            <div className="hidden md:mb-2 md:block md:h-9 md:shrink-0" aria-hidden />
            <div className="flex min-h-[200px] flex-1 flex-col rounded-xl border-2 border-primary/70 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary md:min-h-0">
              <RichTextEditor
                key={`${ged.id}-${editorKey}`}
                value={descriptionValue}
                onChange={setDescriptionValue}
                placeholder={t('noDescription')}
                rows={6}
                readOnly={!descriptionEditEnabled}
                showCharCount={true}
                className="h-full min-h-0 w-full flex-1"
              />
            </div>
          </section>
          </div>

          {/* Fullscreen image overlay with zoom */}
          {isImage && isImageFullscreen && (
            <FullScreenImageZoom
              src={imageUrl}
              alt={cardTitle}
              onClose={() => setIsImageFullscreen(false)}
              ariaLabel={t('fullscreenAria')}
            />
          )}

          {/* Associated GEDs – full width below the two columns */}
          <div className="px-6 py-4 md:px-8">
          <AssociatedGedsList
            items={associatedOnlyThisGed}
            loading={associatedLoading}
            error={associatedError}
            title={t('associatedGedsTitle')}
          />
          </div>
        </div>

        {/* Footer – Save, Reset, Generate PDF */}
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
              className="rounded-xl border-2 border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {pdfGenerating ? t('generatingPdf') : t('generatePdf')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-xl border-2 border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {t('reset')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};
