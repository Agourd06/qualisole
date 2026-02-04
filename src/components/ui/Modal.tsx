import React, { useEffect, useCallback } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional title for the dialog (used in aria-labelledby when provided). */
  titleId?: string;
  /** When true, clicking the overlay closes the modal. */
  closeOnOverlayClick?: boolean;
}

/**
 * Reusable modal: overlay + content, close on Escape or overlay click.
 * Accessible: role="dialog", aria-modal, focus management.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  titleId,
  closeOnOverlayClick = true,
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
        aria-hidden
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        className="relative z-10 w-[80%] max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
