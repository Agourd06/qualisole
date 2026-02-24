import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { useTranslation } from 'react-i18next';
import { getFolderTypes } from '../../../api/foldertypes.api';
import { getFolders } from '../../../api/folders.api';
import { getGeds } from '../../../api/geds.api';
import { getUsers } from '../../../api/users.api';
import { useNavbarFilters } from '../../../context/NavbarFiltersContext';
import type { FolderType } from '../../../types/foldertypes.types';
import type { Folder } from '../../../types/folders.types';
import type { GedItem } from '../../ged/types/ged.types';
import type { User } from '../../../api/users.api';
import { buildImageUrl, isImageUrl } from '../../ged/utils/qualiphotoHelpers';
import { exportControlExecutionPdf, type ControlGedRow } from '../utils/controlPdf';
import { getFolderTypeLabel } from '../utils/controlHelpers';
import { ControlTypesSidebar } from '../components/ControlTypesSidebar';
import { ControlFoldersColumn } from '../components/ControlFoldersColumn';
import { ControlExecutionSection } from '../components/ControlExecutionSection';
import { ControlLongTextModal } from '../components/ControlLongTextModal';

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

  const handleSelectFolderType = useCallback(
    (id: string | null) => {
      setSelectedFolderTypeId(id);
    },
    [setSelectedFolderTypeId],
  );

  const handleSelectFolder = useCallback(
    (id: string | null) => {
      setSelectedFolderId(id);
    },
    [setSelectedFolderId],
  );

  const handleOpenLongTextPreview = useCallback(
    (title: string, text: string) => {
      setLongTextPreview({ title, text });
    },
    [],
  );

  const handleCloseLongTextPreview = useCallback(() => {
    setLongTextPreview(null);
  }, []);

  return (
    <div className="min-h-screen w-[90%] mx-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50">
      <Navbar />

      <main className="flex pb-12 pt-16 gap-6">
        <ControlTypesSidebar
          loading={loading}
          error={error}
          folderTypes={folderTypes}
          foldersByTypeId={foldersByTypeId}
          selectedFolderTypeId={selectedFolderTypeId}
          onSelectFolderType={handleSelectFolderType}
        />

        <ControlFoldersColumn
          folderTypes={folderTypes}
          selectedFolderTypeId={selectedFolderTypeId}
          selectedTypeFolders={selectedTypeFolders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          getUserDisplayName={getUserDisplayName}
        />

        <ControlExecutionSection
          folderTypes={folderTypes}
          selectedFolderTypeId={selectedFolderTypeId}
          selectedFolder={selectedFolder}
          folderGeds={folderGeds}
          folderGedsLoading={folderGedsLoading}
          folderGedsError={folderGedsError}
          onOpenLongTextPreview={handleOpenLongTextPreview}
          onExportPdf={handleExportPdf}
          exportingPdf={exportingPdf}
          getUserDisplayName={getUserDisplayName}
        />
      </main>

      <ControlLongTextModal
        preview={longTextPreview}
        onClose={handleCloseLongTextPreview}
      />
    </div>
  );
};
