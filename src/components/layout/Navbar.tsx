import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { NavDateInput } from '../ui/NavDateInput';
import { NavbarChantierDropdown } from './NavbarChantierDropdown';
import { useNavbarFilters } from '../../context/NavbarFiltersContext';
import { clearAuth, getStoredAuth } from '../../utils/authStorage';
import { LogoutIcon } from '../icons/LogoutIcon';

const NAV_TABS = [
  { to: '/qualiphoto', labelKey: 'constat' as const },
  { to: '/suivi', labelKey: 'suivi' as const },
  { to: '/sequence', labelKey: 'sequence' as const },
  { to: '/chantier', labelKey: 'chantier' as const },
  { to: '/map', labelKey: 'map' as const },
] as const;

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('nav');
  const { t: tFilters } = useTranslation('filters');
  const { user } = getStoredAuth();
  const {
    dateDebut,
    dateFin,
    setDateDebut,
    setDateFin,
  } = useNavbarFilters();

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const navLinkClass =
    'rounded-full px-4 py-2 text-[0.85rem] font-semibold transition-colors';
  const navLinkActive = 'bg-tertiary text-primary';
  const navLinkInactive = 'text-gray-600 hover:bg-gray-100 hover:text-gray-800';

  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4  py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-18 items-center justify-center overflow-hidden rounded-2xl bg-tertiary shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
            <img
              src="/qualisole_logo.png"
              alt="QualiSol logo"
              className="h-8 w-auto object-contain"
            />
          </div>
        
        </div>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Navigation principale">
          {NAV_TABS.map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${navLinkClass} ${isActive ? navLinkActive : navLinkInactive}`
              }
              end={to === '/sequence' || to === '/chantier' || to === '/map'}
            >
              {t(labelKey)}
            </NavLink>
          ))}
          <NavDateInput
            id="navbar-date-debut"
            value={dateDebut}
            onChange={setDateDebut}
            aria-label={tFilters('dateDebut')}
          />
          <NavDateInput
            id="navbar-date-fin"
            value={dateFin}
            onChange={setDateFin}
            aria-label={tFilters('dateFin')}
          />
          <NavbarChantierDropdown />
        </nav>

        <div className="flex items-center gap-3">
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
    </header>
  );
};

