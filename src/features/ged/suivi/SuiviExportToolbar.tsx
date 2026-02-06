import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSuiviExport } from './useSuiviExport';
import type { GedParalleleItem } from '../types/gedParallele.types';

export interface SuiviExportToolbarProps {
  paralleleItems: GedParalleleItem[];
  folderTitle: string;
  folderIntroduction?: string | null;
  folderConclusion?: string | null;
  disabled?: boolean;
}

type Align = 'left' | 'center' | 'right';

/** Two buttons in a group: PDF and Word. */
function ExportButtonGroup({
  label,
  pdfLabel,
  wordLabel,
  onPdf,
  onWord,
  pdfLoading,
  wordLoading,
  pdfDisabled,
  wordDisabled,
  disabled,
  align = 'center',
}: {
  label: string;
  pdfLabel: string;
  wordLabel: string;
  onPdf: () => void;
  onWord: () => void;
  pdfLoading: boolean;
  wordLoading: boolean;
  pdfDisabled: boolean;
  wordDisabled: boolean;
  disabled?: boolean;
  align?: Align;
}) {
  const alignClass =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={`flex items-center gap-2 ${alignClass}`}>
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-neutral-500 whitespace-nowrap">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPdf}
          disabled={disabled || pdfDisabled || pdfLoading}
          className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-white transition-colors hover:bg-red-50 hover:border-red-200 disabled:pointer-events-none disabled:opacity-50"
          aria-label={pdfLabel}
          title={pdfLabel}
        >
          {pdfLoading ? (
            <span className="text-[10px]">…</span>
          ) : (
            <img src="/pdf.png" alt="" className="h-4 w-4 object-contain" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onWord}
          disabled={disabled || wordDisabled || wordLoading}
          className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-white transition-colors hover:bg-blue-50 hover:border-blue-200 disabled:pointer-events-none disabled:opacity-50"
          aria-label={wordLabel}
          title={wordLabel}
        >
          {wordLoading ? (
            <span className="text-[10px]">…</span>
          ) : (
            <img src="/word.png" alt="" className="h-4 w-4 object-contain" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export const SuiviExportToolbar: React.FC<SuiviExportToolbarProps> = ({
  paralleleItems,
  folderTitle,
  folderIntroduction,
  folderConclusion,
  disabled = false,
}) => {
  const { t } = useTranslation('qualiphotoPage');
  const {
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
  } = useSuiviExport({ paralleleItems, folderTitle, folderIntroduction, folderConclusion });

  return (
    <div
      className="flex w-full items-center justify-between gap-4 py-1"
      role="toolbar"
      aria-label={t('suiviExportToolbarAria', 'Export Suivi: PDF and Word')}
    >
      <ExportButtonGroup
        align="left"
        label={t('suiviExportAvantOnly', 'Avant')}
        pdfLabel={t('suiviExportAvantPdfAria', 'Export Avant as PDF')}
        wordLabel={t('suiviExportAvantWordAria', 'Export Avant as Word')}
        onPdf={exportPdfAvant}
        onWord={exportWordAvant}
        pdfLoading={pdfAvantLoading}
        wordLoading={wordAvantLoading}
        pdfDisabled={avantCount === 0}
        wordDisabled={avantCount === 0}
        disabled={disabled}
      />
      <ExportButtonGroup
        align="center"
        label={t('suiviExportBoth', 'Avant & Après')}
        pdfLabel={t('suiviExportBothPdfAria', 'Export Avant and Après as PDF')}
        wordLabel={t('suiviExportBothWordAria', 'Export Avant and Après as Word')}
        onPdf={exportPdfBoth}
        onWord={exportWordBoth}
        pdfLoading={pdfBothLoading}
        wordLoading={wordBothLoading}
        pdfDisabled={bothCount === 0}
        wordDisabled={bothCount === 0}
        disabled={disabled}
      />
      <ExportButtonGroup
        align="right"
        label={t('suiviExportApresOnly', 'Après')}
        pdfLabel={t('suiviExportApresPdfAria', 'Export Après as PDF')}
        wordLabel={t('suiviExportApresWordAria', 'Export Après as Word')}
        onPdf={exportPdfApres}
        onWord={exportWordApres}
        pdfLoading={pdfApresLoading}
        wordLoading={wordApresLoading}
        pdfDisabled={apresCount === 0}
        wordDisabled={apresCount === 0}
        disabled={disabled}
      />
    </div>
  );
};
