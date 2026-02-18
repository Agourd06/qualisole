import type { Projet } from '../types/projets.types';

/** Sentinel ID for "no chantier" filter (unassigned GEDs). */
export const NO_CHANTIER_ID = '__NO_CHANTIER__';

/** Special Projet representing "GEDs with no chantier assigned" - used as default filter. */
export const NO_CHANTIER_PROJET: Projet = {
  id: NO_CHANTIER_ID,
  title: 'Sans chantier',
};

export function isNoChantierSelected(chantier: Projet | null): boolean {
  return chantier != null && chantier.id === NO_CHANTIER_ID;
}
