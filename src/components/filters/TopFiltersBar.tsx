import React from 'react';
import { useTranslation } from 'react-i18next';
import { DateInput } from '../ui/DateInput';
import { SearchableDropdown } from '../ui/SearchableDropdown';
import type { Projet } from '../../types/projets.types';

export interface TopFiltersBarProps {
  dateDebut: string;
  dateFin: string;
  onDateDebutChange: (value: string) => void;
  onDateFinChange: (value: string) => void;
  selectedChantier: Projet | null;
  onChantierSelect: (projet: Projet | null) => void;
  projets: Projet[];
  projetsLoading?: boolean;
}

/**
 * Top filter bar: Date Début, Date Fin, Chantier (searchable dropdown).
 * Date inputs are visual only (no filtering logic here).
 */
export const TopFiltersBar: React.FC<TopFiltersBarProps> = ({
  dateDebut,
  dateFin,
  onDateDebutChange,
  onDateFinChange,
  selectedChantier,
  onChantierSelect,
  projets,
  projetsLoading = false,
}) => {
  const { t } = useTranslation('filters');

  return (
    <div
      className="flex flex-wrap items-end gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      role="group"
      aria-label={t('chantier')}
    >
      <div className="min-w-[140px] max-w-[180px]">
        <DateInput
          label={t('dateDebut')}
          value={dateDebut}
          onChange={onDateDebutChange}
          id="filter-date-debut"
        />
      </div>
      <div className="min-w-[140px] max-w-[180px]">
        <DateInput
          label={t('dateFin')}
          value={dateFin}
          onChange={onDateFinChange}
          id="filter-date-fin"
        />
      </div>
      <div className="min-w-[200px] flex-1 max-w-[320px]">
        <SearchableDropdown<Projet>
          label={t('chantier')}
          placeholder={t('chantierPlaceholder')}
          items={projets}
          value={selectedChantier}
          onSelect={onChantierSelect}
          displayKey="title"
          disabled={projetsLoading}
        />
      </div>
    </div>
  );
};
