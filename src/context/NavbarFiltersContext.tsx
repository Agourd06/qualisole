import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Projet } from '../types/projets.types';
import type { Folder } from '../types/folders.types';

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayDateString(): string {
  return toDateString(new Date());
}

function getOneWeekAgoDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toDateString(d);
}

export interface NavbarFiltersState {
  dateDebut: string;
  dateFin: string;
  selectedChantier: Projet | null;
  selectedFolder: Folder | null;
  refreshTrigger: number;
}

export interface NavbarFiltersContextValue extends NavbarFiltersState {
  setDateDebut: (value: string) => void;
  setDateFin: (value: string) => void;
  setSelectedChantier: (value: Projet | null) => void;
  setSelectedFolder: (value: Folder | null) => void;
  triggerRefresh: () => void;
}

const NavbarFiltersContext = createContext<NavbarFiltersContextValue | null>(null);

export const NavbarFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateDebut, setDateDebut] = useState(getOneWeekAgoDateString);
  const [dateFin, setDateFin] = useState(getTodayDateString);
  const [selectedChantier, setSelectedChantier] = useState<Projet | null>(null);
  const [selectedFolder, setSelectedFolderState] = useState<Folder | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const setSelectedChantierAndClearFolder = useCallback((projet: Projet | null) => {
    setSelectedChantier(projet);
    setSelectedFolderState(null);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  const value = useMemo<NavbarFiltersContextValue>(
    () => ({
      dateDebut,
      dateFin,
      selectedChantier,
      selectedFolder,
      refreshTrigger,
      setDateDebut,
      setDateFin,
      setSelectedChantier: setSelectedChantierAndClearFolder,
      setSelectedFolder: setSelectedFolderState,
      triggerRefresh,
    }),
    [dateDebut, dateFin, selectedChantier, selectedFolder, refreshTrigger, setSelectedChantierAndClearFolder, triggerRefresh],
  );

  return (
    <NavbarFiltersContext.Provider value={value}>
      {children}
    </NavbarFiltersContext.Provider>
  );
};

export function useNavbarFilters(): NavbarFiltersContextValue {
  const ctx = useContext(NavbarFiltersContext);
  if (ctx == null) {
    throw new Error('useNavbarFilters must be used within NavbarFiltersProvider');
  }
  return ctx;
}
