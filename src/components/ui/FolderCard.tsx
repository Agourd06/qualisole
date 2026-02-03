import React from 'react';
import type { Folder } from '../../types/folders.types';

export interface FolderCardProps {
  folder: Folder;
  /** Optional i18n keys for labels */
  codeLabel?: string;
  titleLabel?: string;
}

/**
 * Compact card for a single folder (code, title). Reusable and presentational.
 */
export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  codeLabel = 'Code',
  titleLabel = 'Title',
}) => (
  <article
    className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
    aria-label={folder.title}
  >
    <dl className="flex flex-col gap-1.5 text-sm">
      <div>
        <dt className="sr-only">{codeLabel}</dt>
        <dd className="font-mono text-neutral-500">{folder.code}</dd>
      </div>
      <div>
        <dt className="sr-only">{titleLabel}</dt>
        <dd className="font-medium text-neutral-800">{folder.title}</dd>
      </div>
      {folder.description ? (
        <div>
          <dt className="sr-only">Description</dt>
          <dd className="text-neutral-600 line-clamp-2">{folder.description}</dd>
        </div>
      ) : null}
    </dl>
  </article>
);
