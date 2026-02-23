import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { getFolderTypes } from '../../../api/foldertypes.api';
import { getFolders } from '../../../api/folders.api';
import { getGeds } from '../../../api/geds.api';
import { getUsers } from '../../../api/users.api';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import { Modal } from '../../../components/ui/Modal';
import type { FolderType } from '../../../types/foldertypes.types';
import type { Folder } from '../../../types/folders.types';
import type { GedItem } from '../../ged/types/ged.types';
import type { User } from '../../../api/users.api';
import { buildImageUrl, isImageUrl } from '../../ged/utils/qualiphotoHelpers';
import { exportControlExecutionPdf, type ControlGedRow } from '../utils/controlPdf';

function getFolderTypeLabel(ft: FolderType): string {
  return (
    ft.title ?? ft.name ?? ft.label ?? ft.libelle ?? String(ft.id ?? '—')
  );
}

/** GED kind used in Control page when we want answer-type GEDs. */
const CONTROL_GED_KIND = 'question';

export const ControlPage: React.FC = () => {
  const { t } = useTranslation(['nav', 'controlPage']);
  const { selectedAuthorId } = useNavbarFilters();

  const [folderTypes, setFolderTypes] = useState<FolderType[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolderTypeId, setSelectedFolderTypeId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderGeds, setFolderGeds] = useState<GedItem[]>([]);
  const [folderGedsLoading, setFolderGedsLoading] = useState(false);
  const [folderGedsError, setFolderGedsError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [longTextPreview, setLongTextPreview] = useState<{
    title: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getFolderTypes(), getFolders(), getUsers()])
      .then(([types, folderList, userList]) => {
        if (!cancelled) {
          setFolderTypes(types);
          setFolders(folderList);
          setUsers(userList);
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

  const selectedTypeFolders = useMemo(() => {
    if (!selectedFolderTypeId) return [] as Folder[];
    const base = foldersByTypeId.get(String(selectedFolderTypeId)) ?? [];
    if (!selectedAuthorId) return base;
    return base.filter(
      (f) => String(f.owner_id) === String(selectedAuthorId),
    );
  }, [selectedFolderTypeId, foldersByTypeId, selectedAuthorId]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const ownersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of users) {
      map.set(String(u.id), u);
    }
    return map;
  }, [users]);

  const getUserDisplayName = (id: string | null | undefined): string => {
    if (!id) return '';
    const user = ownersById.get(String(id));
    if (!user) return String(id);
    const firstname = (user as { firstname?: string }).firstname ?? '';
    const lastname = (user as { lastname?: string }).lastname ?? '';
    const full = `${firstname} ${lastname}`.trim();
    return full || String(id);
  };

  // When the selected control type changes, keep folder selection in sync
  useEffect(() => {
    if (!selectedFolderTypeId) {
      setSelectedFolderId(null);
      setFolderGeds([]);
      setFolderGedsError(null);
      setFolderGedsLoading(false);
      return;
    }
    const typeFolders = selectedTypeFolders;
    if (typeFolders.length === 0) {
      setSelectedFolderId(null);
      setFolderGeds([]);
      setFolderGedsError(null);
      setFolderGedsLoading(false);
      return;
    }
    setSelectedFolderId((prev) => {
      if (prev && typeFolders.some((f) => f.id === prev)) {
        return prev;
      }
      return typeFolders[0]?.id ?? null;
    });
  }, [selectedFolderTypeId, selectedTypeFolders]);

  // Load GEDs for the selected folder (third column)
  useEffect(() => {
    if (!selectedFolderId) {
      setFolderGeds([]);
      setFolderGedsError(null);
      setFolderGedsLoading(false);
      return;
    }
    let cancelled = false;
    setFolderGedsLoading(true);
    setFolderGedsError(null);
    getGeds({
      kind: CONTROL_GED_KIND,
      idsource: selectedFolderId,
      limit: 500,
    })
      .then((list) => {
        if (cancelled) return;
        const folderIdNorm = String(selectedFolderId).toLowerCase().trim();
        const kindNorm = String(CONTROL_GED_KIND).toLowerCase().trim();
        const filtered = Array.isArray(list)
          ? list.filter(
              (ged) =>
                String(ged.kind).toLowerCase().trim() === kindNorm &&
                ged.idsource != null &&
                String(ged.idsource).toLowerCase().trim() === folderIdNorm,
            )
          : [];
        setFolderGeds(filtered);
      })
      .catch((err) => {
        if (!cancelled) {
          setFolderGedsError(err instanceof Error ? err.message : 'LOAD_ERROR');
          setFolderGeds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFolderGedsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFolderId]);

  const handleExportPdf = async () => {
    if (!selectedFolder || folderGeds.length === 0 || exportingPdf) return;
    setExportingPdf(true);
    try {
      const selectedType = folderTypes.find(
        (ft) => String(ft.id) === String(selectedFolderTypeId),
      );
      const typeLabel = selectedType ? getFolderTypeLabel(selectedType) : '';
      const controleLabel = selectedFolder.title || selectedFolder.code || '—';
      const ownerName = getUserDisplayName(selectedFolder.owner_id);

      const executionTitle = t(
        'controlPage:executionTitle',
        'Exécution (Contrôle {{controle}} ({{type}}) · {{owner}})',
        {
          controle: controleLabel,
          type: typeLabel || '—',
          owner: ownerName || '—',
        },
      );

      const rows: ControlGedRow[] = folderGeds.map((ged) => {
        const anyGed = ged as unknown as {
          answer?: string | number | null;
        };
        const answer = anyGed.answer ?? '—';
        const imageUrl =
          ged.url && isImageUrl(ged.url) ? buildImageUrl(ged) : null;
        return {
          title: ged.title || '',
          answer: String(answer),
          imageUrl,
        };
      });

      await exportControlExecutionPdf(
        executionTitle,
        rows,
        `execution-${controleLabel.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`,
      );
    } finally {
      setExportingPdf(false);
    }
  };

  // const handleExportPdf = async () => {
  //   // TODO: implement PDF export for Control page GEDs.
  // };

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <main className="flex pb-12 pt-16 gap-6">
        {/* 1) Left: control types (folder types) */}
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
                      setSelectedFolderTypeId(isSelected ? null : id)
                    }
                    className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-md ring-2 ring-primary'
                        : 'border-primary bg-white/80 text-neutral-700 shadow-sm hover:bg-tertiary hover:text-primary hover:border-primary'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className="truncate">{getFolderTypeLabel(ft)}</span>
                    {typeFolders.length > 0 && (
                      <span className={`ml-1 inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        {typeFolders.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </aside>

        {/* 2) Middle: folders for selected control type */}
        <section
          className="flex w-[28vw] min-w-[260px] max-w-[380px] shrink-0 flex-col px-6 border-r border-primary"
          aria-label={t('controlPage:foldersAria', 'Folders')}
        >
          <h2 className="mb-4 text-center text-lg font-semibold text-primary">
            {selectedFolderTypeId
              ? (() => {
                  const selectedType = folderTypes.find((ft) => String(ft.id) === String(selectedFolderTypeId));
                  const typeLabel = selectedType ? getFolderTypeLabel(selectedType) : '';
                  return t('controlPage:controlSelectedType', 'Contrôles ({{type}})', { type: typeLabel });
                })()
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
                      onClick={() => setSelectedFolderId(folder.id)}
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

        {/* 3) Right: execution for selected control & folder */}
        <section
          className="flex flex-1 flex-col pr-8 sm:pr-12 lg:pr-16"
          aria-label={t('controlPage:gedsAria', 'GEDs in folder')}
        >
          <h2 className="mb-4 text-center text-lg font-semibold text-primary">
            {selectedFolder
              ? (() => {
                  const selectedType = folderTypes.find(
                    (ft) => String(ft.id) === String(selectedFolderTypeId),
                  );
                  const typeLabel = selectedType ? getFolderTypeLabel(selectedType) : '';
                  const controleLabel = selectedFolder.title || selectedFolder.code || '—';
                  const ownerName = getUserDisplayName(selectedFolder.owner_id);
                  return t(
                    'controlPage:executionTitle',
                    'Exécution (Contrôle {{controle}} ({{type}}) · {{owner}})',
                    {
                      controle: controleLabel,
                      type: typeLabel || '—',
                      owner: ownerName || '—',
                    },
                  );
                })()
              : t('controlPage:executionTitleSimple', 'Exécution')}
          </h2>

          {!selectedFolderTypeId ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
              {t(
                'controlPage:selectFolderTypeFirst',
                'Select a control type and folder to see GEDs.',
              )}
            </div>
          ) : !selectedFolder ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
              {t('controlPage:selectFolderHint', 'Choose a folder in the middle column to see its GEDs.')}
            </div>
          ) : folderGedsLoading ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/80 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
              {t('controlPage:loading', 'Loading…')}
            </div>
          ) : folderGedsError ? (
            <div className="rounded-2xl bg-red-50/70 px-6 py-4 text-sm text-red-700 shadow-sm">
              {folderGedsError === 'LOAD_ERROR'
                ? t('controlPage:loadError', 'Error while loading.')
                : folderGedsError}
            </div>
          ) : folderGeds.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-10 text-center text-sm text-neutral-500 shadow-sm">
              {t('controlPage:noGedsForFolder', 'No GEDs in this folder yet.')}
            </div>
          ) : (
            <div className="flex flex-1 flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 text-sm text-neutral-600">
                <span className="font-semibold text-neutral-800">
                  {folderGeds.length === 1
                    ? t('controlPage:gedCount_one', '1 GED')
                    : t('controlPage:gedCount_other', '{{count}} GEDs', {
                        count: folderGeds.length,
                      })}
                </span>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingPdf ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <>
                      <img
                        src="/pdf.png"
                        alt=""
                        className="h-3.5 w-3.5 object-contain"
                        aria-hidden
                      />
                      <span>PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] border-b border-neutral-200 bg-neutral-50/90 px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-wide text-neutral-600">
                  <span>{t('controlPage:gedTitleHeader', 'Title')}</span>
                  <span>{t('controlPage:gedAnswerHeader', 'Answer')}</span>
                  <span className="text-right">{t('controlPage:gedQuantityHeader', 'Quantity')}</span>
                  <span className="text-right">{t('controlPage:gedPriceHeader', 'Price')}</span>
                  <span className="text-right">{t('controlPage:gedImageHeader', 'Photo')}</span>
                </div>

                <div className="divide-y divide-neutral-100">
                  {folderGeds.map((ged) => {
                    const anyGed = ged as unknown as {
                      answer?: string | number | null;
                      quantity?: string | number | null;
                      price?: string | number | null;
                    };
                    const answer = anyGed.answer ?? '—';
                    const quantity = anyGed.quantity ?? '—';
                    const price = anyGed.price ?? '—';
                    const imageUrl =
                      ged.url && isImageUrl(ged.url) ? buildImageUrl(ged) : null;
                    const typeNorm = (ged.type || '').toLowerCase().trim();

                    let answerNode: React.ReactNode;
                    if (typeNorm === 'boolean') {
                      const norm = String(answer).toLowerCase().trim();
                      const truthy = ['1', 'true', 'yes', 'oui', 'vrai', 'y'].includes(norm);
                      const falsy = ['0', 'false', 'no', 'non', 'faux', 'n'].includes(norm);
                      if (truthy || falsy) {
                        const isTrue = truthy;
                        answerNode = (
                          <span className="flex items-center justify-start">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${
                                isTrue ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              aria-label={isTrue ? 'Oui' : 'Non'}
                            />
                          </span>
                        );
                      } else {
                        answerNode = <span>{String(answer)}</span>;
                      }
                    } else if (typeNorm === 'taux') {
                      answerNode = <span>{`${String(answer)} %`}</span>;
                    } else if (typeNorm === 'photo') {
                      answerNode = <span className="text-xs text-neutral-600">Photo</span>;
                    } else if (typeNorm === 'long_text') {
                      const text = String(answer);
                      const preview =
                        text.length > 60 ? `${text.slice(0, 57)}…` : text || '—';
                      answerNode = (
                        <button
                          type="button"
                          onClick={() =>
                            setLongTextPreview({
                              title: ged.title || 'Texte',
                              text,
                            })
                          }
                          className="max-w-full truncate text-left text-neutral-700 underline-offset-2 hover:underline"
                        >
                          {preview}
                        </button>
                      );
                    } else {
                      // 'text', 'number', or unknown types default to simple text
                      answerNode = <span>{String(answer)}</span>;
                    }

                    return (
                      <div
                        key={ged.id}
                        className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] px-5 py-2.5 text-[0.85rem] text-neutral-800 hover:bg-neutral-50"
                      >
                        <span className="pr-3 font-medium truncate">{ged.title || '—'}</span>
                        <span className="pr-3 truncate text-neutral-700">{answerNode}</span>
                        <span className="text-right tabular-nums text-neutral-700">{String(quantity)}</span>
                        <span className="text-right tabular-nums text-neutral-800">
                          {String(price)}
                        </span>
                        <span className="flex justify-end">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              className="h-10 w-14 rounded-md border border-neutral-200 object-cover"
                            />
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Modal
        open={longTextPreview != null}
        onClose={() => setLongTextPreview(null)}
        titleId="control-long-text-modal-title"
      >
        <div className="p-6">
          <h2
            id="control-long-text-modal-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {longTextPreview?.title ?? ''}
          </h2>
          <p className="mt-4 whitespace-pre-line text-sm text-neutral-700">
            {longTextPreview?.text ?? ''}
          </p>
        </div>
      </Modal>
    </div>
  );
};
