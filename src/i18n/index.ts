import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';

// New storage key so default resets to French for everyone.
// Old key was 'qualsol_lang' which may have stored 'en'.
const STORAGE_KEY = 'qualsol_lang_v2';

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
  ns: ['nav', 'qualiphotoPage', 'qualiphotoModal', 'auth', 'chantierPage', 'mapPage', 'controlPage'],
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
