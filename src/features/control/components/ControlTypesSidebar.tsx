import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FolderType } from '../../../types/foldertypes.types';
import type { Folder } from '../../../types/folders.types';
import { getFolderTypeLabel } from '../utils/controlHelpers';

interface ControlTypesSidebarProps {
  loading: boolean;
  error: string | null;
  folderTypes: FolderType[];
  foldersByTypeId: Map<string, Folder[]>;
  selectedFolderTypeId: string | null;
  onSelectFolderType: (id: string | null) => void;
}

export const ControlTypesSidebar: React.FC<ControlTypesSidebarProps> = React.memo(
  function ControlTypesSidebar({
    loading,
    error,
    folderTypes,
    foldersByTypeId,
    selectedFolderTypeId,
    onSelectFolderType,
  }) {
    const { t } = useTranslation(['nav', 'controlPage']);

    return (
      <aside
        className="flex w-[22vw] min-w-[240px] max-w-[320px] shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16 pr-6 border-r border-primary"
        aria-label={t('controlPage:folderTypesAria', 'Control types')}
      >
        <h2 className="mb-4 text-center text-lg font-semibold text-primary">
          {t('controlPage:folderTypesTitle', 'Types de contrôle')}
        </h2>

        {loading ? (
          <div className="rounded-2xl bg-white/80 px-6 py-12 text-center text-sm text-neutral-500 shadow-sm backdrop-blur-sm">
            {t('controlPage:loading', 'Loading…')}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700 shadow-sm">
            {error === 'LOAD_ERROR'
              ? t('controlPage:loadError', 'Error while loading.')
              : error}
          </div>
        ) : folderTypes.length === 0 ? (
          <div className="rounded-2xl bg-white/80 px-6 py-12 text-center text-sm text-neutral-500 shadow-sm backdrop-blur-sm">
            {t('controlPage:noFolderTypes', 'No folder types.')}
          </div>
        ) : (
          <nav className="flex flex-col gap-1">
            {folderTypes.map((ft) => {
              const id = String(ft.id);
              const isSelected = id === String(selectedFolderTypeId);
              const typeFolders = foldersByTypeId.get(id) ?? [];

              return (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() =>
                    onSelectFolderType(isSelected ? null : id)
                  }
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-md ring-2 ring-primary'
                      : 'border-primary/80 bg-white/90 text-neutral-700 shadow-sm hover:bg-tertiary hover:text-primary hover:border-primary'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="truncate">{getFolderTypeLabel(ft)}</span>
                  {typeFolders.length > 0 && (
                    <span
                      className={`ml-1 inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {typeFolders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </aside>
    );
  },
);

