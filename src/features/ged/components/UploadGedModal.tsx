import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import { useUploadGed } from '../hooks/useUploadGed';
import { IDSOURCE_EMPTY_GUID } from '../constants';

const ACCEPT_IMAGE = 'image/*';
const ACCEPT_VOICE = 'audio/*,.m4a';

export interface UploadGedModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  /** Folder id for idsource when user selected a folder; otherwise unassigned. */
  selectedFolderId: string | null;
  /** Default chantier name (e.g. from navbar selected chantier). */
  defaultChantier: string;
}

export const UploadGedModal: React.FC<UploadGedModalProps> = ({
  open,
  onClose,
  onSuccess,
  selectedFolderId,
  defaultChantier,
}) => {
  const { t } = useTranslation('qualiphotoPage');
  const {
    uploadGed,
    uploading,
    error,
    geoError,
    clearError,
    getPosition,
    geoLoading,
  } = useUploadGed();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chantier, setChantier] = useState(defaultChantier);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setChantier(defaultChantier);
  }, [defaultChantier, open]);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setImageFile(null);
      setVoiceFile(null);
      setSubmitError(null);
      clearError();
    }
  }, [open, clearError]);

  useEffect(() => {
    if (open) {
      getPosition();
    }
  }, [open, getPosition]);

  const idsource = selectedFolderId ?? IDSOURCE_EMPTY_GUID;
  const blockingError = submitError ?? error;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      if (!imageFile) {
        setSubmitError(t('uploadGedImageRequired'));
        return;
      }
      const created = await uploadGed({
        idsource,
        chantier: chantier.trim() || defaultChantier,
        title: title.trim(),
        description: description.trim(),
        imageFile,
        voiceFile: voiceFile ?? null,
      });
      if (created) {
        await onSuccess?.();
        onClose();
      }
    },
    [idsource, chantier, defaultChantier, title, description, imageFile, voiceFile, uploadGed, onSuccess, onClose, t],
  );

  const handleClose = useCallback(() => {
    if (!uploading) onClose();
  }, [uploading, onClose]);

  return (
    <Modal open={open} onClose={handleClose} titleId="upload-ged-title">
      <div className="p-6">
        <h2 id="upload-ged-title" className="text-lg font-semibold text-neutral-800 mb-4">
          {t('uploadGedTitle')}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {blockingError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {blockingError}
            </div>
          )}
          {geoError && !blockingError && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center gap-2">
              <span>{t('locationUnavailable')}</span>
              <button
                type="button"
                onClick={() => getPosition()}
                disabled={geoLoading}
                className="font-medium text-amber-700 underline hover:no-underline disabled:opacity-50"
              >
                {geoLoading ? '…' : t('retryLocation')}
              </button>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="upload-ged-title-input">
              {t('uploadGedTitleLabel')}
            </label>
            <input
              id="upload-ged-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('uploadGedTitlePlaceholder')}
              className="w-full rounded-lg border-2 border-neutral-200 px-3 py-2 text-neutral-800 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="upload-ged-description">
              {t('uploadGedDescriptionLabel')}
            </label>
            <textarea
              id="upload-ged-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('uploadGedDescriptionPlaceholder')}
              rows={3}
              className="w-full rounded-lg border-2 border-neutral-200 px-3 py-2 text-neutral-800 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="upload-ged-chantier">
              {t('uploadGedChantierLabel')}
            </label>
            <input
              id="upload-ged-chantier"
              type="text"
              value={chantier}
              onChange={(e) => setChantier(e.target.value)}
              placeholder={t('uploadGedChantierPlaceholder')}
              className="w-full rounded-lg border-2 border-neutral-200 px-3 py-2 text-neutral-800 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="upload-ged-image">
              {t('uploadGedImageLabel')}
            </label>
            <input
              id="upload-ged-image"
              type="file"
              accept={ACCEPT_IMAGE}
              required
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="upload-ged-voice">
              {t('uploadGedVoiceLabel')}
            </label>
            <input
              id="upload-ged-voice"
              type="file"
              accept={ACCEPT_VOICE}
              onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-neutral-700"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={uploading || geoLoading || !imageFile}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
            >
              {uploading ? t('uploadGedSubmitting') : t('uploadGedSubmit')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              {t('uploadGedCancel')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
