import type { FolderType } from '../../../types/foldertypes.types';

export function getFolderTypeLabel(ft: FolderType): string {
  return (
    ft.title ?? ft.name ?? ft.label ?? ft.libelle ?? String(ft.id ?? '—')
  );
}

