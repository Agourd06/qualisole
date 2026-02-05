import { useCallback, useMemo, useState } from 'react';
import { getStoredAuth } from '../../../utils/authStorage';
import { formatDisplayDate, isImageUrl } from '../utils/qualiphotoHelpers';
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

async function fetchImageDataUrl(fullUrl: string): Promise<string | null> {
  const { token } = getStoredAuth();
  try {
    const res = await fetch(fullUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function toFolderGedRow(
  title: string | null,
  description: string | null,
  createdAt: string,
  imageDataUrl: string | null,
): FolderGedRow {
  return {
    title: title?.trim() ?? '',
    description: description ?? '',
    imageDataUrl,
    author: null,
    publishedDate: formatDisplayDate(createdAt),
  };
}

export interface UseSuiviExportOptions {
  paralleleItems: GedParalleleItem[];
  folderTitle: string;
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

export function useSuiviExport({
  paralleleItems,
  folderTitle,
}: UseSuiviExportOptions): UseSuiviExportResult {
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

  const buildAvantRows = useCallback(async (): Promise<FolderGedRow[]> => {
    const rows: FolderGedRow[] = [];
    for (const item of paralleleItems) {
      if (!item.url1) continue;
      const fullUrl = buildMediaUrl(item.url1);
      let imageDataUrl: string | null = null;
      if (fullUrl && isImageUrl(item.url1)) {
        imageDataUrl = await fetchImageDataUrl(fullUrl);
      }
      rows.push(
        toFolderGedRow(
          item.title1,
          item.description1,
          item.created_at,
          imageDataUrl,
        ),
      );
    }
    return rows;
  }, [paralleleItems]);

  const buildApresRows = useCallback(async (): Promise<FolderGedRow[]> => {
    const rows: FolderGedRow[] = [];
    for (const item of paralleleItems) {
      if (!item.url2) continue;
      const fullUrl = buildMediaUrl(item.url2);
      let imageDataUrl: string | null = null;
      if (fullUrl && isImageUrl(item.url2)) {
        imageDataUrl = await fetchImageDataUrl(fullUrl);
      }
      rows.push(
        toFolderGedRow(
          item.title2,
          item.description2,
          item.created_at,
          imageDataUrl,
        ),
      );
    }
    return rows;
  }, [paralleleItems]);

  const buildBothRows = useCallback(async (): Promise<SuiviPairRow[]> => {
    const pairs: SuiviPairRow[] = [];
    for (const item of paralleleItems) {
      let avant: FolderGedRow | null = null;
      let apres: FolderGedRow | null = null;

      if (item.url1) {
        const fullUrl = buildMediaUrl(item.url1);
        let imageDataUrl: string | null = null;
        if (fullUrl && isImageUrl(item.url1)) {
          imageDataUrl = await fetchImageDataUrl(fullUrl);
        }
        avant = toFolderGedRow(
          item.title1,
          item.description1,
          item.created_at,
          imageDataUrl,
        );
      }

      if (item.url2) {
        const fullUrl = buildMediaUrl(item.url2);
        let imageDataUrl: string | null = null;
        if (fullUrl && isImageUrl(item.url2)) {
          imageDataUrl = await fetchImageDataUrl(fullUrl);
        }
        apres = toFolderGedRow(
          item.title2,
          item.description2,
          item.created_at,
          imageDataUrl,
        );
      }

      pairs.push({ avant, apres });
    }
    return pairs;
  }, [paralleleItems]);

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
      );
    } finally {
      setPdfAvantLoading(false);
    }
  }, [avantCount, pdfAvantLoading, buildAvantRows, baseTitle, safeName]);

  const exportPdfApres = useCallback(async () => {
    if (apresCount === 0 || pdfApresLoading) return;
    setPdfApresLoading(true);
    try {
      const rows = await buildApresRows();
      await generateSuiviApresPdf(
        `${baseTitle} - Après`,
        rows,
        `suivi-apres-${safeName}-${Date.now()}.pdf`,
      );
    } finally {
      setPdfApresLoading(false);
    }
  }, [apresCount, pdfApresLoading, buildApresRows, baseTitle, safeName]);

  const exportPdfBoth = useCallback(async () => {
    if (bothCount === 0 || pdfBothLoading) return;
    setPdfBothLoading(true);
    try {
      const pairs = await buildBothRows();
      await generateSuiviBothPdf(
        `${baseTitle} - Avant / Après`,
        pairs,
        `suivi-both-${safeName}-${Date.now()}.pdf`,
      );
    } finally {
      setPdfBothLoading(false);
    }
  }, [bothCount, pdfBothLoading, buildBothRows, baseTitle, safeName]);

  const exportWordAvant = useCallback(async () => {
    if (avantCount === 0 || wordAvantLoading) return;
    setWordAvantLoading(true);
    try {
      const rows = await buildAvantRows();
      await generateSuiviAvantWord(
        `${baseTitle} - Avant`,
        rows,
        `suivi-avant-${safeName}-${Date.now()}.docx`,
      );
    } finally {
      setWordAvantLoading(false);
    }
  }, [avantCount, wordAvantLoading, buildAvantRows, baseTitle, safeName]);

  const exportWordApres = useCallback(async () => {
    if (apresCount === 0 || wordApresLoading) return;
    setWordApresLoading(true);
    try {
      const rows = await buildApresRows();
      await generateSuiviApresWord(
        `${baseTitle} - Après`,
        rows,
        `suivi-apres-${safeName}-${Date.now()}.docx`,
      );
    } finally {
      setWordApresLoading(false);
    }
  }, [apresCount, wordApresLoading, buildApresRows, baseTitle, safeName]);

  const exportWordBoth = useCallback(async () => {
    if (bothCount === 0 || wordBothLoading) return;
    setWordBothLoading(true);
    try {
      const pairs = await buildBothRows();
      await generateSuiviBothWord(
        `${baseTitle} - Avant / Après`,
        pairs,
        `suivi-both-${safeName}-${Date.now()}.docx`,
      );
    } finally {
      setWordBothLoading(false);
    }
  }, [bothCount, wordBothLoading, buildBothRows, baseTitle, safeName]);

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
