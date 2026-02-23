import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import { getUsers } from '../../api/users.api';
import type { User } from '../../api/users.api';

export const NavbarAssignedToDropdown: React.FC = () => {
  const { t } = useTranslation('qualiphotoPage');
  const { selectedAssignedToId, setSelectedAssignedToId } = useNavbarFilters();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
    let cancelled = false;
    setLoading(true);
    getUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        // Silently fail - users list is optional
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = (u: User): string => {
    const firstname = (u as { firstname?: string }).firstname ?? '';
    const lastname = (u as { lastname?: string }).lastname ?? '';
    return `${firstname} ${lastname}`.trim() || u.id;
  };

  const selectedUser = users.find((u) => u.id === selectedAssignedToId);
  const buttonText = selectedUser ? displayName(selectedUser) : t('filterAssignedToPlaceholder', 'Assigned to');

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-[0.85rem] font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
      >
        <span className="max-w-[120px] truncate">{loading ? t('loading', 'Loading...') : buttonText}</span>
        <span className="text-gray-400" aria-hidden>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
            role="listbox"
          >
            <ul
              role="listbox"
              className="max-h-[280px] overflow-y-auto py-1"
            >
              <li
                role="option"
                onClick={() => {
                  setSelectedAssignedToId(null);
                  setIsOpen(false);
                }}
                className={`flex cursor-pointer items-center px-3 py-2 text-sm text-neutral-800 transition ${
                  selectedAssignedToId === null
                    ? 'bg-neutral-100 font-medium'
                    : 'hover:bg-neutral-50'
                }`}
              >
                {t('filterAssignedToPlaceholder', 'Assigned to')}
              </li>
              {users.map((user) => {
                const isSelected = user.id === selectedAssignedToId;
                return (
                  <li
                    key={user.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedAssignedToId(user.id);
                      setIsOpen(false);
                    }}
                    className={`flex cursor-pointer items-center px-3 py-2 text-sm text-neutral-800 transition ${
                      isSelected
                        ? 'bg-neutral-100 font-medium'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <span className="min-w-0 truncate">{displayName(user)}</span>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};
