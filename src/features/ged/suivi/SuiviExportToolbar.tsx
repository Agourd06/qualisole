import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSuiviExport } from './useSuiviExport';
import type { GedParalleleItem } from '../types/gedParallele.types';

export interface SuiviExportToolbarProps {
  paralleleItems: GedParalleleItem[];
  folderTitle: string;
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
    align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';
  return (
    <div className={`flex flex-col gap-0.5 ${alignClass}`}>
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPdf}
          disabled={disabled || pdfDisabled || pdfLoading}
          className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:border-neutral-300 disabled:pointer-events-none disabled:opacity-50"
          aria-label={pdfLabel}
        >
          {pdfLoading ? '…' : 'PDF'}
        </button>
        <button
          type="button"
          onClick={onWord}
          disabled={disabled || wordDisabled || wordLoading}
          className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:border-neutral-300 disabled:pointer-events-none disabled:opacity-50"
          aria-label={wordLabel}
        >
          {wordLoading ? '…' : 'Word'}
        </button>
      </div>
    </div>
  );
}

export const SuiviExportToolbar: React.FC<SuiviExportToolbarProps> = ({
  paralleleItems,
  folderTitle,
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
  } = useSuiviExport({ paralleleItems, folderTitle });

  return (
    <div
      className="flex w-full items-end justify-between gap-4 py-1"
      role="toolbar"
      aria-label={t('suiviExportToolbarAria', 'Export Suivi: PDF and Word')}
    >
      <ExportButtonGroup
        align="left"
        label={t('suiviExportAvantOnly', 'Avant only')}
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
        label={t('suiviExportApresOnly', 'Après only')}
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
