import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';

const STORAGE_KEY = 'qualsol_lang';

function getStoredLanguage(): 'fr' | 'en' {
  if (typeof window === 'undefined') return 'fr';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  return 'fr';
}

const resources = {
  fr,
  en,
};

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'fr',
  defaultNS: 'qualiphotoPage',
  ns: ['nav', 'qualiphotoPage', 'qualiphotoModal', 'auth', 'chantierPage'],
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
