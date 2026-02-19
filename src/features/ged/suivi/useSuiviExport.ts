import { useCallback, useMemo, useState } from 'react';
import { formatDisplayDate, isImageUrl, isVideoUrl } from '../utils/qualiphotoHelpers';
import type { GedParalleleItem } from '../types/gedParallele.types';
import type { FolderGedRow } from '../utils/qualiphotoPdf';
import type { SuiviPairRow } from '../utils/suiviExportPdf';
import {
  generateSuiviAvantPdf,
  generateSuiviApresPdf,
  generateSuiviBothPdf,
} from '../utils/suiviExportPdf';
import {
  generateSuiviAvantWord,
  generateSuiviApresWord,
  generateSuiviBothWord,
} from '../utils/suiviExportWord';
import { buildMediaUrl } from './utils';
import { fetchImageAsDataUrl } from '../utils/gedExportUtils';
import { getGeds } from '../services/ged.service';
import { QUALIPHOTO_KIND, IDSOURCE_MAIN, IDSOURCE_EMPTY_GUID } from '../constants';
import type { GedItem } from '../types/ged.types';

function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.startsWith('/') ? url.slice(1) : url;
}

function toFolderGedRow(
  title: string | null,
  description: string | null,
  createdAt: string,
  imageDataUrl: string | null,
  url?: string | null,
  author?: string | null,
): FolderGedRow {
  return {
    title: title?.trim() ?? '',
    description: description ?? '',
    imageDataUrl,
    author: author ?? null,
    publishedDate: formatDisplayDate(createdAt),
    isVideo: url ? isVideoUrl(url) : false,
  };
}

export interface UseSuiviExportOptions {
  paralleleItems: GedParalleleItem[];
  folderTitle: string;
  folderId?: string | null;
  folderIntroduction?: string | null;
  folderConclusion?: string | null;
}

export interface UseSuiviExportResult {
  /** Number of rows that have Avant (url1). */
  avantCount: number;
  /** Number of rows that have Après (url2). */
  apresCount: number;
  /** Number of parallele rows (for "both" export). */
  bothCount: number;
  pdfAvantLoading: boolean;
  pdfBothLoading: boolean;
  pdfApresLoading: boolean;
  wordAvantLoading: boolean;
  wordBothLoading: boolean;
  wordApresLoading: boolean;
  exportPdfAvant: () => Promise<void>;
  exportPdfBoth: () => Promise<void>;
  exportPdfApres: () => Promise<void>;
  exportWordAvant: () => Promise<void>;
  exportWordBoth: () => Promise<void>;
  exportWordApres: () => Promise<void>;
}

const exportOptions = (introduction?: string | null, conclusion?: string | null) =>
  (introduction || conclusion) ? { introduction: introduction ?? undefined, conclusion: conclusion ?? undefined } : undefined;

export function useSuiviExport({
  paralleleItems,
  folderTitle,
  folderId,
  folderIntroduction,
  folderConclusion,
}: UseSuiviExportOptions): UseSuiviExportResult {
  const options = useMemo(
    () => exportOptions(folderIntroduction, folderConclusion),
    [folderIntroduction, folderConclusion],
  );
  const [pdfAvantLoading, setPdfAvantLoading] = useState(false);
  const [pdfBothLoading, setPdfBothLoading] = useState(false);
  const [pdfApresLoading, setPdfApresLoading] = useState(false);
  const [wordAvantLoading, setWordAvantLoading] = useState(false);
  const [wordBothLoading, setWordBothLoading] = useState(false);
  const [wordApresLoading, setWordApresLoading] = useState(false);

  const avantCount = useMemo(
    () => paralleleItems.filter((r) => r.url1).length,
    [paralleleItems],
  );
  const apresCount = useMemo(
    () => paralleleItems.filter((r) => r.url2).length,
    [paralleleItems],
  );
  const bothCount = paralleleItems.length;

  const buildAuthorMap = useCallback(
    async (
      gedIds: string[],
      rowUrls: string[],
    ): Promise<{ byId: Map<string, string | null>; byUrl: Map<string, string | null> }> => {
      const byId = new Map<string, string | null>();
      const byUrl = new Map<string, string | null>();
      if (gedIds.length === 0 && rowUrls.length === 0) return { byId, byUrl };

      const wantedIds = new Set(gedIds.map((id) => String(id)));
      const wantedUrls = new Set(rowUrls.map((u) => normalizeUrl(u)).filter(Boolean));

      // Fetch from all potentially relevant idsource values.
      const sources = new Set<string | number>([IDSOURCE_MAIN, IDSOURCE_EMPTY_GUID]);
      if (folderId) sources.add(folderId);
      for (const row of paralleleItems) {
        if (row.idsource1) sources.add(String(row.idsource1));
        if (row.idsource2) sources.add(String(row.idsource2));
        if (row.id) sources.add(String(row.id));
      }

      // Suivi rows may contain mixed kinds; include all kinds to avoid missing GEDs.
      const kinds = new Set<string>([QUALIPHOTO_KIND]);
      for (const row of paralleleItems) {
        if (row.kind1) kinds.add(row.kind1);
        if (row.kind2) kinds.add(row.kind2);
      }

      try {
        const lists = await Promise.all(
          Array.from(sources).flatMap((idsource) =>
            Array.from(kinds).map((kind) =>
              getGeds({
                kind,
                idsource,
                limit: 1000,
              }),
            ),
          ),
        );

        const byIdGed = new Map<string, GedItem>();
        const byUrlGed = new Map<string, GedItem>();
        for (const list of lists) {
          for (const ged of list) {
            if (ged.id) byIdGed.set(String(ged.id), ged);
            const urlKey = normalizeUrl(ged.url);
            if (urlKey) byUrlGed.set(urlKey, ged);
          }
        }

        for (const id of wantedIds) {
          const ged = byIdGed.get(id);
          if (ged) byId.set(id, ged.author ?? null);
        }

        for (const urlKey of wantedUrls) {
          const ged = byUrlGed.get(urlKey);
          if (ged) byUrl.set(urlKey, ged.author ?? null);
        }
      } catch (error) {
        console.warn('Failed to resolve authors for suivi export:', error);
      }

      return { byId, byUrl };
    },
    [folderId, paralleleItems],
  );

  const buildAvantRows = useCallback(async (): Promise<FolderGedRow[]> => {
    const gedIds = paralleleItems
      .map((item) => item.id1)
      .filter((id): id is string => Boolean(id));
    const rowUrls = paralleleItems.map((item) => item.url1 ?? '').filter(Boolean);
    const authorMaps = await buildAuthorMap(gedIds, rowUrls);

    const rows: FolderGedRow[] = [];
    for (const item of paralleleItems) {
      if (!item.url1) continue;
      const fullUrl = buildMediaUrl(item.url1);
      let imageDataUrl: string | null = null;
      if (fullUrl && isImageUrl(item.url1)) {
        imageDataUrl = await fetchImageAsDataUrl(fullUrl);
      }

      const author =
        (item.id1 ? authorMaps.byId.get(String(item.id1)) : null) ??
        authorMaps.byUrl.get(normalizeUrl(item.url1)) ??
        null;

      rows.push(
        toFolderGedRow(
          item.title1,
          item.description1,
          item.created_at,
          imageDataUrl,
          item.url1,
          author,
        ),
      );
    }
    return rows;
  }, [paralleleItems, buildAuthorMap]);

  const buildApresRows = useCallback(async (): Promise<FolderGedRow[]> => {
    const gedIds = paralleleItems
      .map((item) => item.id2)
      .filter((id): id is string => Boolean(id));
    const rowUrls = paralleleItems.map((item) => item.url2 ?? '').filter(Boolean);
    const authorMaps = await buildAuthorMap(gedIds, rowUrls);

    const rows: FolderGedRow[] = [];
    for (const item of paralleleItems) {
      if (!item.url2) continue;
      const fullUrl = buildMediaUrl(item.url2);
      let imageDataUrl: string | null = null;
      if (fullUrl && isImageUrl(item.url2)) {
        imageDataUrl = await fetchImageAsDataUrl(fullUrl);
      }

      const author =
        (item.id2 ? authorMaps.byId.get(String(item.id2)) : null) ??
        authorMaps.byUrl.get(normalizeUrl(item.url2)) ??
        null;

      rows.push(
        toFolderGedRow(
          item.title2,
          item.description2,
          item.created_at,
          imageDataUrl,
          item.url2,
          author,
        ),
      );
    }
    return rows;
  }, [paralleleItems, buildAuthorMap]);

  const buildBothRows = useCallback(async (): Promise<SuiviPairRow[]> => {
    const allGedIds = paralleleItems
      .flatMap((item) => [item.id1, item.id2])
      .filter((id): id is string => Boolean(id));
    const allUrls = paralleleItems
      .flatMap((item) => [item.url1 ?? '', item.url2 ?? ''])
      .filter(Boolean);
    const authorMaps = await buildAuthorMap(allGedIds, allUrls);

    const pairs: SuiviPairRow[] = [];
    for (const item of paralleleItems) {
      let avant: FolderGedRow | null = null;
      let apres: FolderGedRow | null = null;

      if (item.url1) {
        const fullUrl = buildMediaUrl(item.url1);
        let imageDataUrl: string | null = null;
        if (fullUrl && isImageUrl(item.url1)) {
          imageDataUrl = await fetchImageAsDataUrl(fullUrl);
        }

        const author =
          (item.id1 ? authorMaps.byId.get(String(item.id1)) : null) ??
          authorMaps.byUrl.get(normalizeUrl(item.url1)) ??
          null;

        avant = toFolderGedRow(
          item.title1,
          item.description1,
          item.created_at,
          imageDataUrl,
          item.url1,
          author,
        );
      }

      if (item.url2) {
        const fullUrl = buildMediaUrl(item.url2);
        let imageDataUrl: string | null = null;
        if (fullUrl && isImageUrl(item.url2)) {
          imageDataUrl = await fetchImageAsDataUrl(fullUrl);
        }

        const author =
          (item.id2 ? authorMaps.byId.get(String(item.id2)) : null) ??
          authorMaps.byUrl.get(normalizeUrl(item.url2)) ??
          null;

        apres = toFolderGedRow(
          item.title2,
          item.description2,
          item.created_at,
          imageDataUrl,
          item.url2,
          author,
        );
      }

      pairs.push({ avant, apres });
    }
    return pairs;
  }, [paralleleItems, buildAuthorMap]);

  const safeName = (folderTitle || 'suivi').replace(/[^\w\-]/g, '_');
  const baseTitle = folderTitle?.trim() || 'Suivi';

  const exportPdfAvant = useCallback(async () => {
    if (avantCount === 0 || pdfAvantLoading) return;
    setPdfAvantLoading(true);
    try {
      const rows = await buildAvantRows();
      await generateSuiviAvantPdf(
        `${baseTitle} - Avant`,
        rows,
        `suivi-avant-${safeName}-${Date.now()}.pdf`,
        options,
      );
    } finally {
      setPdfAvantLoading(false);
    }
  }, [avantCount, pdfAvantLoading, buildAvantRows, baseTitle, safeName, options]);

  const exportPdfApres = useCallback(async () => {
    if (apresCount === 0 || pdfApresLoading) return;
    setPdfApresLoading(true);
    try {
      const rows = await buildApresRows();
      await generateSuiviApresPdf(
        `${baseTitle} - Après`,
        rows,
        `suivi-apres-${safeName}-${Date.now()}.pdf`,
        options,
      );
    } finally {
      setPdfApresLoading(false);
    }
  }, [apresCount, pdfApresLoading, buildApresRows, baseTitle, safeName, options]);

  const exportPdfBoth = useCallback(async () => {
    if (bothCount === 0 || pdfBothLoading) return;
    setPdfBothLoading(true);
    try {
      const pairs = await buildBothRows();
      await generateSuiviBothPdf(
        `${baseTitle} - Avant / Après`,
        pairs,
        `suivi-both-${safeName}-${Date.now()}.pdf`,
        options,
      );
    } finally {
      setPdfBothLoading(false);
    }
  }, [bothCount, pdfBothLoading, buildBothRows, baseTitle, safeName, options]);

  const exportWordAvant = useCallback(async () => {
    if (avantCount === 0 || wordAvantLoading) return;
    setWordAvantLoading(true);
    try {
      const rows = await buildAvantRows();
      await generateSuiviAvantWord(
        `${baseTitle} - Avant`,
        rows,
        `suivi-avant-${safeName}-${Date.now()}.docx`,
        options,
      );
    } finally {
      setWordAvantLoading(false);
    }
  }, [avantCount, wordAvantLoading, buildAvantRows, baseTitle, safeName, options]);

  const exportWordApres = useCallback(async () => {
    if (apresCount === 0 || wordApresLoading) return;
    setWordApresLoading(true);
    try {
      const rows = await buildApresRows();
      await generateSuiviApresWord(
        `${baseTitle} - Après`,
        rows,
        `suivi-apres-${safeName}-${Date.now()}.docx`,
        options,
      );
    } finally {
      setWordApresLoading(false);
    }
  }, [apresCount, wordApresLoading, buildApresRows, baseTitle, safeName, options]);

  const exportWordBoth = useCallback(async () => {
    if (bothCount === 0 || wordBothLoading) return;
    setWordBothLoading(true);
    try {
      const pairs = await buildBothRows();
      await generateSuiviBothWord(
        `${baseTitle} - Avant / Après`,
        pairs,
        `suivi-both-${safeName}-${Date.now()}.docx`,
        options,
      );
    } finally {
      setWordBothLoading(false);
    }
  }, [bothCount, wordBothLoading, buildBothRows, baseTitle, safeName, options]);

  return {
    avantCount,
    apresCount,
    bothCount,
    pdfAvantLoading,
    pdfBothLoading,
    pdfApresLoading,
    wordAvantLoading,
    wordBothLoading,
    wordApresLoading,
    exportPdfAvant,
    exportPdfBoth,
    exportPdfApres,
    exportWordAvant,
    exportWordBoth,
    exportWordApres,
  };
}
