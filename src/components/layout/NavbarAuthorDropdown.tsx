import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import { getUsers } from '../../api/users.api';
import type { User } from '../../api/users.api';

export const NavbarAuthorDropdown: React.FC = () => {
  const { t } = useTranslation('qualiphotoPage');
  const { selectedAuthorId, setSelectedAuthorId } = useNavbarFilters();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

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
    const fullName = `${firstname} ${lastname}`.trim();
    if (fullName) return fullName;
    // Fallback to email or id if name not available
    const email = (u as { email?: string }).email;
    return email ?? u.id;
  };

  const selectedUser = users.find((u) => u.id === selectedAuthorId);
  const displayTrigger = selectedUser ? displayName(selectedUser) : t('filterAuthor');

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdown = document.getElementById('navbar-author-dropdown');
      if (dropdown && !dropdown.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div id="navbar-author-dropdown" className="relative">
      <button
        type="button"
        onClick={() => !loading && setIsOpen((o) => !o)}
        disabled={loading}
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
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <ul
            role="listbox"
            className="max-h-[280px] overflow-y-auto py-1"
          >
            <li
              role="option"
              onClick={() => {
                setSelectedAuthorId(null);
                setIsOpen(false);
              }}
              className={`flex cursor-pointer items-center px-3 py-2 text-sm text-neutral-800 transition ${
                selectedAuthorId === null
                  ? 'bg-neutral-100 font-medium'
                  : 'hover:bg-neutral-50'
              }`}
            >
              {t('filterAuthorPlaceholder')}
            </li>
            {users.map((user) => {
              const isSelected = user.id === selectedAuthorId;
              return (
                <li
                  key={user.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedAuthorId(user.id);
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
        </div>
      )}
    </div>
  );
};
