import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface LanguageSwitcherProps {
  /** Optional class for positioning (e.g. fixed for login, default inline). */
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={
        className ??
        'flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[0.8rem] font-semibold text-primary shadow-[0_6px_18px_rgba(0,0,0,0.16)] backdrop-blur-sm transition hover:bg-white'
      }
      aria-label={language === 'fr' ? 'Switch to English' : 'Passer en français'}
    >
      <span className={language === 'fr' ? 'text-primary' : 'text-gray-400'}>FR</span>
      <span className="text-gray-300">/</span>
      <span className={language === 'en' ? 'text-primary' : 'text-gray-400'}>EN</span>
    </button>
  );
};
