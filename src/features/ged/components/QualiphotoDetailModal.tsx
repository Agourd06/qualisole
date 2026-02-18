import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichTextEditor } from '../../../components/inputs/RichTextEditor';
import { useTranslation } from 'react-i18next';
import { updateGed } from '../services/ged.service';
import { generateQualiphotoPdf } from '../utils/qualiphotoPdf';
import { fetchImageAsDataUrl } from '../utils/gedExportUtils';
import { formatDisplayDate, getCreatedAtDisplay, getMediaType, buildVoiceUrl } from '../utils/qualiphotoHelpers';
import { useAssociatedGeds } from '../hooks/useAssociatedGeds';
import { AssociatedGedsList } from './AssociatedGedsList';
import { FullScreenImageZoom } from '../../../components/ui/FullScreenImageZoom';
import { POWERED_BY } from '../../../utils/constants';
import { MapPinIcon, PoweredByStarsIcon, ModeIcon } from './QualiphotoGallerySection';
import type { GedItem } from '../types/ged.types';

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

  /** Increment vue (view count) when user opens the modal. Runs once per GED open. */
  const vueIncrementedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ged) {
      vueIncrementedRef.current = null;
      return;
    }
    if (vueIncrementedRef.current === ged.id) return;
    vueIncrementedRef.current = ged.id;
    const nextVue = (ged.vue ?? 0) + 1;
    updateGed({
      id: ged.id,
      kind: ged.kind,
      idsource: ged.idsource,
      vue: nextVue,
    }).catch(() => {
      /* Silently ignore; view count is non-critical */
    });
  }, [ged?.id, ged]);

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
        imageDataUrl = await fetchImageAsDataUrl(imageUrl);
      }
      // For video/audio, imageDataUrl stays null; PDF shows title/author/description only
      const photoDate = getCreatedAtDisplay(ged);
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

  const photoDate = getCreatedAtDisplay(ged);
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
      contentClassName="relative z-10 w-[90vw] min-h-[88vh] max-h-[92vh] overflow-auto rounded-xl bg-[#F9FAFB] shadow-[0_4px_24px_rgba(0,0,0,0.08)] focus:outline-none"
    >
      <div className="flex min-h-[88vh] w-full flex-col">
        {/* Header: centered title (30%) + close */}
        <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
          <div className="flex-1" aria-hidden />
          <div className="flex w-[30%] min-w-[180px] shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white focus-within:ring-2 focus-within:ring-primary/30">
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              disabled={!titleEditEnabled}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-center text-[0.9375rem] font-medium text-neutral-800 placeholder:text-neutral-400 disabled:bg-transparent disabled:text-neutral-600 focus:outline-none focus:ring-0"
              placeholder={t('defaultTitle')}
              aria-label={t('titleLabel')}
            />
            <button
              type="button"
              onClick={() => setTitleEditEnabled((e) => !e)}
              className="shrink-0 rounded-r-lg p-2.5 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset"
              aria-label={t('updateAria')}
              title={t('updateAria')}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={t('closeAria')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {/* Main content: image left | description right – row fills to bottom */}
          <div className="flex flex-1 min-h-0 flex-col gap-4 px-6 py-4 md:flex-row md:items-stretch md:gap-4 md:px-6 md:py-6">
            {/* Media – 45% width */}
            <section className="flex w-full flex-col md:w-[45%] md:min-h-0 md:shrink-0">
            <div className="group relative min-h-0 flex-1 overflow-hidden rounded-xl border-2 border-primary bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                {/* Top overlays: map | [stars + poweredby] | mode */}
                {(isImage || isVideo) && (
                  <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between pt-2 px-3" aria-hidden>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-500/60">
                      <MapPinIcon visible={ged.visible} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1">
                      <PoweredByStarsIcon iaanalyse={ged.iaanalyse} />
                      <span className="text-[0.6rem] font-medium tracking-wide text-white">
                        {ged.poweredby ?? POWERED_BY}
                      </span>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-500/60">
                      <ModeIcon mode={ged.mode} />
                    </div>
                  </div>
                )}
                {isImage && (
                  <button
                    type="button"
                    onClick={() => setIsImageFullscreen(true)}
                    className="flex h-full w-full cursor-zoom-in items-center justify-center rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset"
                    aria-label={t('enlargeImageAria')}
                  >
                    <img
                      src={imageUrl}
                      alt={cardTitle}
                      className="h-full w-full object-cover object-top overflow-hidden"
                      draggable={false}
                    />
                  </button>
                )}
                {isVideo && (
                  <div className="flex h-full w-full flex-col rounded-lg overflow-hidden">
                    <video
                      src={imageUrl}
                      controls
                      playsInline
                      className="h-full w-full object-cover object-top overflow-hidden bg-neutral-900"
                      aria-label={cardTitle}
                    />
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
                {(isImage || isVideo) && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm border-t border-primary/30 px-4 py-2.5 pointer-events-none"
                    aria-hidden
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[0.8rem] font-medium text-primary">
                        {ged.author || '—'}
                      </span>
                      <span className="shrink-0 truncate max-w-[120px] text-center text-[0.75rem] text-primary">
                        {ged.chantier ?? ged.categorie ?? '—'}
                      </span>
                      <span className="min-w-0 flex-1 shrink-0 tabular-nums text-right text-[0.8rem] font-medium text-primary">
                        {formatDisplayDate(ged.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

          {/* Description – fills from top to bottom */}
          <section className="flex w-full flex-col md:min-h-0 md:min-w-0 md:flex-1 md:shrink-0">
            <div className="qualiphoto-modal-editor qualiphoto-modal-editor-focus flex min-h-0 flex-1 flex-col">
              <RichTextEditor
                key={`${ged.id}-${editorKey}`}
                value={descriptionValue}
                onChange={setDescriptionValue}
                placeholder={t('noDescription')}
                readOnly={!descriptionEditEnabled}
                showCharCount={true}
                className="h-full border-primary"
                height="100%"
              />
            </div>
          </section>
          </div>

          {/* Voice note – under image and description, when present */}
          {ged.urlvoice && (() => {
            const voiceUrl = buildVoiceUrl(ged.urlvoice);
            if (!voiceUrl) return null;
            return (
              <div className="px-6 py-3 md:px-8">
                <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-neutral-700">{t('voiceNoteLabel')}</p>
                  <audio
                    src={voiceUrl}
                    controls
                    className="w-full max-w-md"
                    aria-label={t('playVoiceNoteAria')}
                  />
                </div>
              </div>
            );
          })()}

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

        {/* Footer – actions */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7EB] bg-white px-6 py-4">
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
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {pdfGenerating ? t('generatingPdf') : t('generatePdf')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {t('reset')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};
