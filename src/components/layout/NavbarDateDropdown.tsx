import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';

export const NavbarDateDropdown: React.FC = () => {
  const { t } = useTranslation('filters');
  const { dateDebut, dateFin, setDateDebut, setDateFin } = useNavbarFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const ro = new ResizeObserver(updatePosition);
    if (buttonRef.current) ro.observe(buttonRef.current);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-[0.85rem] font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
      >
        <span>{t('date')}</span>
        <span className="text-gray-400" aria-hidden>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] overflow-hidden rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              minWidth: 220,
            }}
            role="dialog"
            aria-label={t('dateRange')}
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-600">
                  {t('dateDebut')}
                </span>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="nav-date-input rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label={t('dateDebut')}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-600">
                  {t('dateFin')}
                </span>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="nav-date-input rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label={t('dateFin')}
                />
              </label>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
