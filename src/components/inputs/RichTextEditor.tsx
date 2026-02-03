import React, { Suspense, useEffect, useMemo, useState } from 'react';

const SunEditor = React.lazy(() => import('suneditor-react'));

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  'aria-labelledby'?: string;
  'aria-label'?: string;
  /** When true, content is read-only but toolbar stays visible (Remarks-style). */
  readOnly?: boolean;
  /** Show character count at bottom right (Remarks-style). */
  showCharCount?: boolean;
  /** Optional class for the wrapper. */
  className?: string;
}

const fallbackView = (
  <div className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-neutral-200 border-dashed bg-neutral-50 text-sm text-neutral-500">
    Loading editor…
  </div>
);

/** Strip HTML to approximate plain-text length for character count. */
function getTextLength(html: string): number {
  if (!html) return 0;
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return html.replace(/<[^>]*>/g, '').length;
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').length;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  rows = 6,
  id,
  'aria-labelledby': ariaLabelledBy,
  'aria-label': ariaLabel,
  readOnly = false,
  showCharCount = true,
  className = '',
}) => {
  const [isClient, setIsClient] = useState(false);
  const [cssLoaded, setCssLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
    import('suneditor/dist/css/suneditor.min.css')
      .then(() => setCssLoaded(true))
      .catch(() => setCssLoaded(true));
  }, []);

  const editorHeight = useMemo(() => `${Math.max(rows * 1.6, 8)}rem`, [rows]);
  const charCount = useMemo(() => getTextLength(value), [value]);

  /* Always show full toolbar (Remarks-style); readOnly only disables editing. */
  const editorOptions = useMemo(
    () => ({
      buttonList: [
        ['undo', 'redo'],
        ['bold', 'italic', 'underline', 'strike'],
        ['fontColor', 'hiliteColor'],
        ['fontSize', 'formatBlock'],
        ['align', 'list', 'indent', 'outdent'],
        ['link', 'image', 'removeFormat'],
      ],
      fontSize: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48],
      minHeight: '200px',
      maxHeight: '600px',
      resizingBar: true,
      showPathLabel: false,
      charCounter: false,
      readOnly,
    }),
    [readOnly],
  );

  if (!isClient || !cssLoaded) {
    return fallbackView;
  }

  return (
    <div
      className={`rich-text-editor-qualisol w-full overflow-hidden rounded-xl border-2 border-neutral-200 bg-white shadow-sm ${className}`}
      id={id}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
    >
      <Suspense fallback={fallbackView}>
        <SunEditor
          onChange={(content: string) => onChange(content)}
          setContents={value}
          height={editorHeight}
          placeholder={placeholder}
          setOptions={editorOptions}
        />
      </Suspense>
      {showCharCount && (
        <div className="flex justify-end border-t border-neutral-100 bg-neutral-50/80 px-3 py-1.5">
          <span className="text-xs text-neutral-500 tabular-nums">
            Characters: {charCount}
          </span>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
