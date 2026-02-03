import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SEARCH_DEBOUNCE_MS } from '../../constants/filters';

export interface SearchableDropdownProps<T> {
  label: string;
  placeholder: string;
  items: T[];
  onSelect: (item: T | null) => void;
  displayKey: keyof T;
  /** Selected item to show in trigger (controlled). */
  value: T | null;
  id?: string;
  disabled?: boolean;
  /** Max height of list (px). */
  listMaxHeight?: number;
}

const DEFAULT_LIST_MAX_HEIGHT = 200;

export function SearchableDropdown<T extends Record<string, unknown>>({
  label,
  placeholder,
  items,
  onSelect,
  displayKey,
  value,
  id,
  disabled = false,
  listMaxHeight = DEFAULT_LIST_MAX_HEIGHT,
}: SearchableDropdownProps<T>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const displayValue = value != null ? String(value[displayKey] ?? '') : '';

  const filteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    const term = debouncedSearch.toLowerCase();
    return items.filter((item) =>
      String(item[displayKey] ?? '').toLowerCase().includes(term)
    );
  }, [items, debouncedSearch, displayKey]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search);
      setHighlightIndex(-1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (highlightIndex >= 0 && highlightIndex < filteredItems.length && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightIndex, filteredItems.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setDebouncedSearch('');
    setHighlightIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      close();
    },
    [onSelect, close]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
          filteredItems.length ? (i + 1) % filteredItems.length : -1
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) =>
          filteredItems.length
            ? (i - 1 + filteredItems.length) % filteredItems.length
            : -1
        );
        return;
      }
      if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < filteredItems.length) {
        e.preventDefault();
        handleSelect(filteredItems[highlightIndex]);
      }
    },
    [isOpen, close, filteredItems, highlightIndex, handleSelect]
  );

  const inputId = id ?? `searchable-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-listbox`}
          aria-label={label}
          id={inputId}
          className="flex cursor-pointer items-center rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        >
          {isOpen ? (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              autoComplete="off"
              disabled={disabled}
              className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-4 py-2.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
              aria-autocomplete="list"
              aria-activedescendant={
                highlightIndex >= 0 && highlightIndex < filteredItems.length
                  ? `${inputId}-option-${highlightIndex}`
                  : undefined
              }
            />
          ) : (
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(true)}
              disabled={disabled}
              onKeyDown={handleKeyDown}
              className="flex min-w-0 flex-1 items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-neutral-600 outline-none placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-500"
            >
              <span className={displayValue ? 'text-neutral-800' : ''}>
                {displayValue || placeholder}
              </span>
              <span className="shrink-0 pl-2 text-neutral-400" aria-hidden>
                {isOpen ? '▲' : '▼'}
              </span>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute top-full z-50 mt-1 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
          style={{ maxHeight: listMaxHeight }}
        >
          {filteredItems.length === 0 ? (
            <li className="px-4 py-3 text-sm text-neutral-500" role="option">
              Aucun résultat
            </li>
          ) : (
            filteredItems.map((item, index) => {
              const text = String(item[displayKey] ?? '');
              const isHighlighted = index === highlightIndex;
              return (
                <li
                  key={String(item.id ?? index)}
                  id={`${inputId}-option-${index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`cursor-pointer px-4 py-2.5 text-sm text-neutral-800 transition ${
                    isHighlighted ? 'bg-neutral-200' : 'hover:bg-neutral-100'
                  }`}
                >
                  {text}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
