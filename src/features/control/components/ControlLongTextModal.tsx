import React from 'react';
import { Modal } from '../../../components/ui/Modal';

interface ControlLongTextModalProps {
  preview: {
    title: string;
    text: string;
  } | null;
  onClose: () => void;
}

export const ControlLongTextModal: React.FC<ControlLongTextModalProps> = ({
  preview,
  onClose,
}) => {
  return (
    <Modal
      open={preview != null}
      onClose={onClose}
      titleId="control-long-text-modal-title"
    >
      <div className="w-full max-w-2xl bg-gradient-to-br from-white via-neutral-50 to-neutral-100 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="control-long-text-modal-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {preview?.title ?? ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-800"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg bg-white/90 px-4 py-3 text-sm leading-relaxed text-neutral-800 shadow-inner">
          {preview?.text ?? ''}
        </div>
      </div>
    </Modal>
  );
};

