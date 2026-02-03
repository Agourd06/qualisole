import React from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { NavbarFiltersProvider } from './context/NavbarFiltersContext';
import { AppRoutes } from './routes/AppRoutes';

/**
 * Root application shell.
 *
 * This is the right place to attach global providers (theme, query client,
 * auth context, i18n, etc.) and app‑wide layout wrappers as the app grows.
 */
export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <NavbarFiltersProvider>
        <AppRoutes />
      </NavbarFiltersProvider>
    </LanguageProvider>
  );
};

