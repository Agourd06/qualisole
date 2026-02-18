import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { getFolderTypes } from '../../../api/foldertypes.api';
import { getFolders } from '../../../api/folders.api';
import type { FolderType } from '../../../types/foldertypes.types';
import type { Folder } from '../../../types/folders.types';

function getFolderTypeLabel(ft: FolderType): string {
  return (
    ft.title ?? ft.name ?? ft.label ?? ft.libelle ?? String(ft.id ?? '—')
  );
}

export const ControlPage: React.FC = () => {
  const { t } = useTranslation(['nav', 'controlPage']);

  const [folderTypes, setFolderTypes] = useState<FolderType[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolderTypeId, setSelectedFolderTypeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getFolderTypes(), getFolders()])
      .then(([types, folderList]) => {
        if (!cancelled) {
          setFolderTypes(types);
          setFolders(folderList);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'LOAD_ERROR');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Group folders by foldertype_id */
  const foldersByTypeId = useMemo(() => {
    const map = new Map<string, Folder[]>();
    for (const f of folders) {
      if (f.foldertype_id == null) continue;
      const key = String(f.foldertype_id);
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    return map;
  }, [folders]);

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <main className="flex pb-12 pt-16 gap-6">
        {/* Left: Folder types with folders nested under the selected one */}
        <aside
          className="flex w-[28vw] min-w-[260px] max-w-[360px] shrink-0 flex-col pl-8 sm:pl-12 lg:pl-16"
          aria-label={t('controlPage:folderTypesAria', 'Folder types')}
        >
          <h2 className="mb-4 text-lg font-semibold text-neutral-800">
            {t('controlPage:folderTypesTitle', 'Folder types')}
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
                const isSelected = String(ft.id) === String(selectedFolderTypeId);
                const typeFolders = isSelected
                  ? foldersByTypeId.get(String(ft.id)) ?? []
                  : [];
                return (
                  <div key={ft.id} className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFolderTypeId(isSelected ? null : ft.id)
                      }
                      className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-md ring-2 ring-primary/40'
                          : 'bg-white/80 text-neutral-700 shadow-sm hover:bg-tertiary hover:text-primary border border-neutral-200/60 hover:border-primary/30'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {getFolderTypeLabel(ft)}
                    </button>
                    {typeFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-2 rounded-lg border-l-2 border-primary/40 bg-neutral-50/80 py-2 pl-6 pr-4 text-sm text-neutral-700"
                      >
                        <span className="text-primary/70 font-medium">—</span>
                        <span className="font-medium">
                          {folder.title || folder.code || t('controlPage:noTitle', 'Untitled')}
                        </span>
                        {folder.code && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            {folder.code}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Right: empty for now */}
        <div className="flex-1 pr-8 sm:pr-12 lg:pr-16" aria-hidden />
      </main>
    </div>
  );
};
