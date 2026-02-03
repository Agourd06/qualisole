import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useProjets } from '../../hooks/useProjets';
import { useFolders } from '../../hooks/useFolders';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import type { Projet } from '../../types/projets.types';
import type { Folder } from '../../types/folders.types';
import { SEARCH_DEBOUNCE_MS } from '../../constants/filters';

const LIST_MAX_HEIGHT = 280;
const FOLDERS_PANEL_MIN_WIDTH = 220;

export const NavbarChantierDropdown: React.FC = () => {
  const { t } = useTranslation('filters');
  const { selectedChantier, setSelectedChantier, setSelectedFolder } = useNavbarFilters();
  const { projets, loading: projetsLoading } = useProjets();
  const { foldersByProject } = useFolders();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hoveredProject, setHoveredProject] = useState<Projet | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const displayTrigger = selectedChantier ? selectedChantier.title : t('chantier');

  const filteredProjets = useMemo(() => {
    if (!debouncedSearch.trim()) return projets;
    const term = debouncedSearch.toLowerCase();
    return projets.filter((p) =>
      (p.title ?? '').toLowerCase().includes(term),
    );
  }, [projets, debouncedSearch]);

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
      highlightIndex < filteredProjets.length &&
      listRef.current
    ) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightIndex, filteredProjets.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setDebouncedSearch('');
    setHighlightIndex(-1);
    setHoveredProject(null);
  }, []);

  /** Show folders panel only when a project is selected (click), not on hover. */
  const folders = useMemo(
    () =>
      selectedChantier ? foldersByProject(selectedChantier.id) : [],
    [selectedChantier, foldersByProject],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
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
          filteredProjets.length ? (i + 1) % filteredProjets.length : -1,
        );
        setHoveredProject(null);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) =>
          filteredProjets.length
            ? (i - 1 + filteredProjets.length) % filteredProjets.length
            : -1,
        );
        setHoveredProject(null);
        return;
      }
      if (
        e.key === 'Enter' &&
        highlightIndex >= 0 &&
        highlightIndex < filteredProjets.length
      ) {
        e.preventDefault();
        setSelectedChantier(filteredProjets[highlightIndex]);
        setHoveredProject(filteredProjets[highlightIndex]);
      }
    },
    [
      isOpen,
      close,
      filteredProjets,
      highlightIndex,
      setSelectedChantier,
    ],
  );

  return (
    <div ref={containerRef} className="relative">
      <button
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

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
          style={{ minWidth: 320 }}
        >
          {/* Left: search + projects */}
          <div className="flex flex-col border-r border-neutral-100" style={{ width: 260 }}>
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
              {filteredProjets.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-neutral-500">
                  Aucun résultat
                </li>
              ) : (
                filteredProjets.map((projet, index) => {
                  const isHighlighted = index === highlightIndex;
                  const isHovered = hoveredProject?.id === projet.id;
                  return (
                    <li
                      key={projet.id}
                      role="option"
                      aria-selected={isHighlighted || isHovered}
                      onMouseEnter={() => {
                        setHoveredProject(projet);
                        setHighlightIndex(index);
                      }}
                      onClick={() => {
                        setSelectedChantier(projet);
                        setHoveredProject(projet);
                      }}
                      className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-neutral-800 transition ${
                        isHighlighted || isHovered
                          ? 'bg-neutral-100'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <span className="min-w-0 truncate">{projet.title}</span>
                      <span className="shrink-0 text-neutral-400" aria-hidden>
                        ▶
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Right: folders only when a project is selected */}
          <div
            className="flex flex-col bg-neutral-50/80"
            style={{
              minWidth: FOLDERS_PANEL_MIN_WIDTH,
              maxWidth: 280,
            }}
          >
            {selectedChantier ? (
              <>
                <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500">
                  {t('foldersForProject')} — {selectedChantier.title}
                </div>
                <ul
                  className="overflow-y-auto py-1"
                  style={{ maxHeight: LIST_MAX_HEIGHT }}
                  role="list"
                >
                  {folders.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-neutral-500">
                      {t('noFolders')}
                    </li>
                  ) : (
                    folders.map((folder: Folder) => (
                      <li
                        key={folder.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedFolder(folder)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' || e.key === ' '
                            ? (e.preventDefault(), setSelectedFolder(folder))
                            : null
                        }
                        className="cursor-pointer border-b border-neutral-100/80 px-3 py-2 text-sm text-neutral-700 last:border-0 hover:bg-white/80 hover:shadow-sm"
                        aria-label={`${folder.title} (${folder.code})`}
                      >
                        <div className="font-mono text-xs text-neutral-500">
                          {folder.code}
                        </div>
                        <div className="font-medium text-neutral-800">
                          {folder.title}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-neutral-400">
                {t('noProjectSelected')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
