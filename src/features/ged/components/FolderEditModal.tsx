import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import { RichTextEditor } from '../../../components/inputs/RichTextEditor';
import { updateFolder } from '../../../api/folders.api';

export interface FolderEditModalProps {
  open: boolean;
  folderId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialConclusion: string | null;
  onClose: () => void;
  /** Called after a successful save so parent can update local state if needed. */
  onSaved?: (payload: { title?: string; description?: string; conclusion?: string }) => void;
}

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
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
);

export const FolderEditModal: React.FC<FolderEditModalProps> = ({
  open,
  folderId,
  initialTitle,
  initialDescription,
  initialConclusion,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation('qualiphotoPage');

  const [title, setTitle] = useState(initialTitle ?? '');
  const [introduction, setIntroduction] = useState(initialDescription ?? '');
  const [conclusion, setConclusion] = useState(initialConclusion ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? '');
    setIntroduction(initialDescription ?? '');
    setConclusion(initialConclusion ?? '');
    setError(null);
  }, [open, initialTitle, initialDescription, initialConclusion]);

  const handleSave = async () => {
    if (!folderId) return;

    const hasTitle = title != null && title.trim() !== '';
    const hasIntro = introduction != null && introduction.trim() !== '';
    const hasConclusion = conclusion != null && conclusion.trim() !== '';

    if (!hasTitle && !hasIntro && !hasConclusion) {
      setError(t('folderErrorEmpty'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateFolder({
        id: folderId,
        ...(hasTitle && { title }),
        ...(hasIntro && { description: introduction }),
        ...(hasConclusion && { conclusion }),
      });
      onSaved?.({
        ...(hasTitle && { title: title.trim() }),
        ...(hasIntro && { description: introduction }),
        ...(hasConclusion && { conclusion }),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('folderErrorGeneric'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} titleId="folder-edit-modal-title">
      <div className="mx-auto w-full max-w-6xl bg-gradient-to-br from-neutral-50 via-white to-neutral-100/80">
        <header className="flex items-center justify-between border-b border-neutral-200/70 bg-white/95 px-6 py-3 backdrop-blur-sm">
          <h2
            id="folder-edit-modal-title"
            className="text-base font-semibold text-neutral-800"
          >
            {t('editFolderTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={t('closeAria', { ns: 'qualiphotoModal' })}
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

        <div className="px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col space-y-6 items-stretch">
            <div>
              <label className="mb-2 block text-sm font-medium uppercase tracking-wide text-neutral-500">
                {t('folderTitleLabel')}
              </label>
              <div className="flex items-center gap-2 rounded-xl border-2 border-neutral-200 bg-white shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent px-5 py-3.5 text-base font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                  placeholder={t('folderTitlePlaceholder')}
                />
                <span className="mr-2 shrink-0 text-neutral-400">
                  <PencilIcon className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col min-h-[300px]">
                <label className="mb-2 block text-sm font-medium uppercase tracking-wide text-neutral-500">
                  {t('folderIntroLabel')}
                </label>
                <div className="flex-1 min-h-[260px]">
                  <RichTextEditor
                    value={introduction}
                    onChange={setIntroduction}
                    placeholder={t('folderIntroPlaceholder')}
                    rows={10}
                    showCharCount={true}
                  />
                </div>
              </div>

              <div className="flex flex-col min-h-[300px]">
                <label className="mb-2 block text-sm font-medium uppercase tracking-wide text-neutral-500">
                  {t('folderConclusionLabel')}
                </label>
                <div className="flex-1 min-h-[260px]">
                  <RichTextEditor
                    value={conclusion}
                    onChange={setConclusion}
                    placeholder={t('folderConclusionPlaceholder')}
                    rows={10}
                    showCharCount={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/60 bg-white/95 px-6 py-3 backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border-2 border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {t('folderCancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
            >
              {saving ? t('folderSaving') : t('folderSave')}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

