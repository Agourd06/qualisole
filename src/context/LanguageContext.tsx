import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuthLanguage } from '../constants/auth';

interface LanguageContextValue {
  language: AuthLanguage;
  setLanguage: (lang: AuthLanguage) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<AuthLanguage>(
    () => (i18n.language === 'en' ? 'en' : 'fr')
  );

  useEffect(() => {
    const handleChange = (lng: string) => {
      setLanguageState(lng === 'en' ? 'en' : 'fr');
    };
    i18n.on('languageChanged', handleChange);
    return () => i18n.off('languageChanged', handleChange);
  }, [i18n]);

  const setLanguage = useCallback(
    (lang: AuthLanguage) => {
      i18n.changeLanguage(lang);
    },
    [i18n]
  );

  const toggleLanguage = useCallback(() => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  }, [i18n]);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
