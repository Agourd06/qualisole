import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FolderType } from '../../../types/foldertypes.types';
import type { Folder } from '../../../types/folders.types';
import { getFolderTypeLabel } from '../utils/controlHelpers';

interface ControlFoldersColumnProps {
  folderTypes: FolderType[];
  selectedFolderTypeId: string | null;
  selectedTypeFolders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  getUserDisplayName: (id: string | null | undefined) => string;
}

export const ControlFoldersColumn: React.FC<ControlFoldersColumnProps> = React.memo(
  function ControlFoldersColumn({
    folderTypes,
    selectedFolderTypeId,
    selectedTypeFolders,
    selectedFolderId,
    onSelectFolder,
    getUserDisplayName,
  }) {
    const { t } = useTranslation(['nav', 'controlPage']);

    const selectedTypeLabel = React.useMemo(() => {
      if (!selectedFolderTypeId) return '';
      const selectedType = folderTypes.find(
        (ft) => String(ft.id) === String(selectedFolderTypeId),
      );
      return selectedType ? getFolderTypeLabel(selectedType) : '';
    }, [folderTypes, selectedFolderTypeId]);

    return (
      <section
        className="flex w-[28vw] min-w-[260px] max-w-[380px] shrink-0 flex-col px-6 border-r border-primary"
        aria-label={t('controlPage:foldersAria', 'Folders')}
      >
        <h2 className="mb-4 text-center text-lg font-semibold text-primary">
          {selectedFolderTypeId
            ? t(
                'controlPage:controlSelectedType',
                'Contrôles ({{type}})',
                { type: selectedTypeLabel },
              )
            : t('controlPage:controlsTitle', 'Contrôles')}
        </h2>

        {!selectedFolderTypeId ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
            {t(
              'controlPage:selectFolderTypeHint',
              'Choose a control type on the left to see related folders.',
            )}
          </div>
        ) : selectedTypeFolders.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
            {t('controlPage:noFoldersForType', 'No folders for this type.')}
          </div>
        ) : (
          <ul className="flex flex-1 flex-col gap-2 rounded-2xl bg-white/80 px-4 py-4 shadow-sm backdrop-blur-sm">
            {selectedTypeFolders.map((folder) => {
              const isSelectedFolder = folder.id === selectedFolderId;
              const ownerName = getUserDisplayName(folder.owner_id);

              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => onSelectFolder(folder.id)}
                    className={`flex w-full flex-col rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      isSelectedFolder
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'border-primary bg-white hover:bg-neutral-50'
                    }`}
                    aria-pressed={isSelectedFolder}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-neutral-800 truncate">
                        {folder.title || t('controlPage:noTitle', 'Untitled')}
                      </span>
                      {ownerName && (
                        <span className="shrink-0 truncate text-[0.75rem] text-neutral-500">
                          {ownerName}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  },
);

