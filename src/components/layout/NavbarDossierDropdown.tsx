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
import { useFolders } from '../../hooks/useFolders';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import type { Folder } from '../../types/folders.types';
import type { Projet } from '../../types/projets.types';
import { useProjets } from '../../hooks/useProjets';
import { SEARCH_DEBOUNCE_MS } from '../../constants/filters';

const LIST_MAX_HEIGHT = 280;

export const NavbarDossierDropdown: React.FC = () => {
  const { t } = useTranslation('filters');
  const { selectedFolder, setSelectedFolder, selectedChantier } = useNavbarFilters();
  const { folders, foldersByProject, loading: foldersLoading } = useFolders();
  const { projets } = useProjets();

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

  const projetById = useMemo(
    () => Object.fromEntries(projets.map((p) => [p.id, p])),
    [projets],
  );

  const folderList = useMemo(
    () =>
      selectedChantier ? foldersByProject(selectedChantier.id) : folders,
    [selectedChantier, foldersByProject, folders],
  );

  const filteredFolders = useMemo(() => {
    if (!debouncedSearch.trim()) return folderList;
    const term = debouncedSearch.toLowerCase();
    return folderList.filter(
      (f) =>
        (f.title ?? '').toLowerCase().includes(term) ||
        (f.code ?? '').toLowerCase().includes(term),
    );
  }, [folderList, debouncedSearch]);

  const displayTrigger = selectedFolder
    ? `${selectedFolder.code} — ${selectedFolder.title}`
    : t('dossier');

  useEffect(() => {
    const tId = window.setTimeout(() => {
      setDebouncedSearch(search);
      setHighlightIndex(-1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(tId);
  }, [search]);

  useEffect(() => {
    if (
      highlightIndex >= 0 &&
      highlightIndex < filteredFolders.length &&
      listRef.current
    ) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightIndex, filteredFolders.length]);

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
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) =>
          filteredFolders.length ? (i + 1) % filteredFolders.length : -1,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) =>
          filteredFolders.length
            ? (i - 1 + filteredFolders.length) % filteredFolders.length
            : -1,
        );
        return;
      }
      if (
        e.key === 'Enter' &&
        highlightIndex >= 0 &&
        highlightIndex < filteredFolders.length
      ) {
        e.preventDefault();
        setSelectedFolder(filteredFolders[highlightIndex]);
        close();
      }
    },
    [isOpen, close, filteredFolders, highlightIndex, setSelectedFolder],
  );

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !foldersLoading && setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        disabled={foldersLoading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-[0.85rem] font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
      >
        <span className="max-w-[140px] truncate">{displayTrigger}</span>
        <span className="text-gray-400" aria-hidden>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
            style={{ top: position.top, left: position.left, minWidth: 280 }}
          >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('dossierPlaceholder')}
            autoComplete="off"
            className="border-b border-neutral-100 px-3 py-2.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            aria-label={t('dossier')}
          />
          {selectedChantier && (
            <div className="border-b border-neutral-100 px-3 py-1.5 text-xs text-neutral-500">
              {t('foldersForProject')} — {selectedChantier.title}
            </div>
          )}
          <ul
            ref={listRef}
            role="listbox"
            className="overflow-y-auto py-1"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
          >
            {filteredFolders.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-neutral-500">
                {folderList.length === 0
                  ? selectedChantier
                    ? t('noFolders')
                    : t('noProjectSelected')
                  : t('noSearchResult')}
              </li>
            ) : (
              filteredFolders.map((folder: Folder, index: number) => {
                const isHighlighted = index === highlightIndex;
                const isSelected = selectedFolder?.id === folder.id;
                const projet = projetById[folder.project_id] as Projet | undefined;
                return (
                  <li
                    key={folder.id}
                    role="option"
                    aria-selected={isHighlighted || isSelected}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => {
                      setSelectedFolder(folder);
                      close();
                    }}
                    className={`flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm text-neutral-800 transition ${
                      isHighlighted || isSelected
                        ? 'bg-neutral-100'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-neutral-500">
                        {folder.code}
                      </span>
                      {!selectedChantier && projet && (
                        <span className="truncate text-xs text-neutral-400">
                          {projet.title}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 truncate font-medium">
                      {folder.title}
                    </span>
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
