import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { NavbarDateDropdown } from './NavbarDateDropdown';
import { NavbarChantierDropdown } from './NavbarChantierDropdown';
import { NavbarDossierDropdown } from './NavbarDossierDropdown';
import { NavbarAuthorDropdown } from './NavbarAuthorDropdown';
import { UploadGedModal } from '../../features/ged/components/UploadGedModal';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import { clearAuth, getStoredAuth } from '../../utils/authStorage';
import { LogoutIcon } from '../icons/LogoutIcon';

const NAV_TABS = [
  { to: '/qualiphoto', labelKey: 'constat' as const },
  { to: '/suivi', labelKey: 'suivi' as const },
  { to: '/sequence', labelKey: 'sequence' as const },
  { to: '/control', labelKey: 'control' as const },
  { to: '/map', labelKey: 'map' as const },
] as const;

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('nav');
  const { user } = getStoredAuth();
  const { selectedFolder, selectedChantier, triggerRefresh } = useNavbarFilters();
  const [addConstatModalOpen, setAddConstatModalOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const handleAddConstatSuccess = () => {
    triggerRefresh();
    setAddConstatModalOpen(false);
  };

  const navLinkClass =
    'whitespace-nowrap rounded-full px-2.5 py-1.5 text-[0.8rem] font-semibold transition-colors sm:px-3 sm:py-2 sm:text-[0.85rem]';
  const navLinkActive = 'bg-tertiary text-primary border-b-2 border-orange';
  const navLinkInactive = 'border-b-2 border-orange/80 text-gray-600 shadow-sm transition duration-150 hover:bg-tertiary-hover hover:text-gray-800';

  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 lg:gap-5 lg:px-6 lg:py-3">
        {/* Left: Logo | Refresh | Dates | Chantier | Dossier | Add Constat — one line */}
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 lg:gap-3 overflow-x-auto">
          <div className="flex shrink-0 items-center gap-3 pl-2">
            <div className="flex h-9 w-18 items-center justify-center overflow-hidden rounded-2xl bg-tertiary shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
              <img
                src="/qualisole_logo.png"
                alt="QualiSol logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={triggerRefresh}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary hover:bg-tertiary hover:text-primary"
              aria-label={t('refreshAria')}
              title={t('refresh')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <NavbarDateDropdown />
          <NavbarAuthorDropdown />
          <NavbarChantierDropdown />
          <NavbarDossierDropdown />
          <button
            type="button"
            onClick={() => setAddConstatModalOpen(true)}
            className="whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-[0.8rem] font-semibold text-white shadow-sm transition hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-[0.85rem]"
          >
            {t('addConstat')}
          </button>
        </div>

        {/* Center: Nav tabs - never wrap, stay on one line, centered */}
        <nav
          className="flex shrink-0 flex-nowrap items-center justify-center gap-1 sm:gap-2"
          aria-label="Navigation principale"
        >
          {NAV_TABS.map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${navLinkClass} ${isActive ? navLinkActive : navLinkInactive}`
              }
              end={to === '/sequence' || to === '/control' || to === '/map'}
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Right: Language | User | Logout */}
        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <LanguageSwitcher className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[0.8rem] font-semibold shadow-sm transition hover:border-primary hover:bg-tertiary hover:text-primary" />
          {user && (
            <div className="hidden text-[0.8rem] text-gray-600 sm:block">
              <div className="font-semibold">
                {user.firstname} {user.lastname}
              </div>
              <div className="text-[0.7rem] text-gray-400">{user.role}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-tertiary text-primary shadow-[0_6px_14px_rgba(0,0,0,0.12)] transition hover:bg-tertiary-hover"
            aria-label={t('logoutAria')}
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <UploadGedModal
        open={addConstatModalOpen}
        onClose={() => setAddConstatModalOpen(false)}
        onSuccess={handleAddConstatSuccess}
        selectedFolderId={selectedFolder?.id ?? null}
        defaultChantier={selectedChantier?.title ?? ''}
      />
    </header>
  );
};

