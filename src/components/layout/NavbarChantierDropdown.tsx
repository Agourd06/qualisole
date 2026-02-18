import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useProjets } from '../../hooks/useProjets';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import { SEARCH_DEBOUNCE_MS } from '../../constants/filters';
import { NO_CHANTIER_ID, NO_CHANTIER_PROJET } from '../../constants/chantier';

const LIST_MAX_HEIGHT = 280;

export const NavbarChantierDropdown: React.FC = () => {
  const { t } = useTranslation('filters');
  const { selectedChantier, setSelectedChantier } = useNavbarFilters();
  const { projets, loading: projetsLoading } = useProjets();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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

  const displayTrigger = selectedChantier
    ? (selectedChantier.id === NO_CHANTIER_ID ? t('noChantier') : selectedChantier.title)
    : t('chantier');

  const filteredProjets = useMemo(() => {
    if (!debouncedSearch.trim()) return projets;
    const term = debouncedSearch.toLowerCase();
    return projets.filter((p) =>
      p.id !== NO_CHANTIER_ID && (p.title ?? '').toLowerCase().includes(term),
    );
  }, [projets, debouncedSearch]);

  const showNoChantierOption = !debouncedSearch.trim() || 'sans chantier'.includes(debouncedSearch.toLowerCase().trim()) || t('noChantier').toLowerCase().includes(debouncedSearch.toLowerCase().trim());

  useEffect(() => {
    const tId = window.setTimeout(() => {
      setDebouncedSearch(search);
      setHighlightIndex(-1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(tId);
  }, [search]);

  const optionCount = (showNoChantierOption ? 1 : 0) + filteredProjets.length;
  useEffect(() => {
    if (
      highlightIndex >= 0 &&
      highlightIndex < optionCount &&
      listRef.current
    ) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightIndex, optionCount]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setDebouncedSearch('');
    setHighlightIndex(-1);
  }, []);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      const optionCount = (showNoChantierOption ? 1 : 0) + filteredProjets.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) =>
          optionCount ? (i + 1) % optionCount : -1,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) =>
          optionCount
            ? (i - 1 + optionCount) % optionCount
            : -1,
        );
        return;
      }
      if (e.key === 'Enter' && highlightIndex >= 0 && optionCount > 0) {
        e.preventDefault();
        if (showNoChantierOption && highlightIndex === 0) {
          setSelectedChantier(NO_CHANTIER_PROJET);
        } else if (showNoChantierOption) {
          setSelectedChantier(filteredProjets[highlightIndex - 1]);
        } else {
          setSelectedChantier(filteredProjets[highlightIndex]);
        }
        close();
      }
    },
    [
      isOpen,
      close,
      filteredProjets,
      highlightIndex,
      showNoChantierOption,
      setSelectedChantier,
    ],
  );

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !projetsLoading && setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        disabled={projetsLoading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-[0.85rem] font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
      >
        <span className="max-w-[120px] truncate">{displayTrigger}</span>
        <span className="text-gray-400" aria-hidden>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
            style={{ top: position.top, left: position.left, minWidth: 260 }}
          >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chantierPlaceholder')}
            autoComplete="off"
            className="border-b border-neutral-100 px-3 py-2.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            aria-label={t('chantier')}
          />
          <ul
            ref={listRef}
            role="listbox"
            className="overflow-y-auto py-1"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
          >
            {showNoChantierOption && (
              <li
                role="option"
                aria-selected={highlightIndex === 0 || selectedChantier?.id === NO_CHANTIER_ID}
                onMouseEnter={() => setHighlightIndex(0)}
                onClick={() => {
                  setSelectedChantier(NO_CHANTIER_PROJET);
                  close();
                }}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium transition border-b border-neutral-100 ${
                  highlightIndex === 0 || selectedChantier?.id === NO_CHANTIER_ID
                    ? 'bg-primary/10 text-primary'
                    : 'text-primary hover:bg-primary/5'
                }`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"
                  aria-hidden
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </span>
                <span className="min-w-0 truncate">{t('noChantier')}</span>
                <span className="ml-auto shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
                  {t('chantier')}
                </span>
              </li>
            )}
            {filteredProjets.length === 0 && !showNoChantierOption ? (
              <li className="px-3 py-2.5 text-sm text-neutral-500">
                Aucun résultat
              </li>
            ) : (
              filteredProjets.map((projet, index) => {
                const listIndex = (showNoChantierOption ? 1 : 0) + index;
                const isHighlighted = listIndex === highlightIndex;
                const isSelected = selectedChantier?.id === projet.id;
                return (
                  <li
                    key={projet.id}
                    role="option"
                    aria-selected={isHighlighted || isSelected}
                    onMouseEnter={() => setHighlightIndex(listIndex)}
                    onClick={() => {
                      setSelectedChantier(projet);
                      close();
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-neutral-800 transition ${
                      isHighlighted || isSelected
                        ? 'bg-neutral-100'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <span className="min-w-0 truncate">{projet.title}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
          document.body,
        )}
    </div>
  );
};
