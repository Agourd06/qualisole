import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ImageFileWithPreview {
  file: File;
  preview: string;
  id: string;
  mediaType: 'image' | 'video';
}

export interface ImageUploadInputProps {
  /** Selected image files */
  images: ImageFileWithPreview[];
  /** Callback when images change */
  onImagesChange: (images: ImageFileWithPreview[]) => void;
  /** Whether multiple images are allowed */
  multiple?: boolean;
  /** Whether folder selection is enabled */
  allowFolder?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the input is disabled */
  disabled?: boolean;
}

const ACCEPT_MEDIA = 'image/*,video/*';

/**
 * Media upload input component supporting:
 * - Single media selection (image or video)
 * - Multiple mixed media selection
 * - Folder selection (webkitdirectory)
 * 
 * Best practices:
 * - Separated component for reusability
 * - Preview generation for better UX
 * - Proper cleanup of object URLs
 * - Accessible file input
 */
export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  images,
  onImagesChange,
  multiple = false,
  allowFolder = false,
  error,
  disabled = false,
}) => {
  const { t } = useTranslation('qualiphotoPage');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // Cleanup preview URLs when component unmounts.
  React.useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        const blobUrl = URL.createObjectURL(file);
        blobUrlsRef.current.add(blobUrl);
        resolve(blobUrl);
        return;
      }
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        resolve('');
      }
    });
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      const mediaFiles = files.filter(
        (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
      );

      if (mediaFiles.length === 0) {
        return;
      }

      const newImages: ImageFileWithPreview[] = await Promise.all(
        mediaFiles.map(async (file) => ({
          file,
          preview: await createPreview(file),
          id: `${Date.now()}-${Math.random()}`,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
        }))
      );

      if (multiple) {
        onImagesChange([...images, ...newImages]);
      } else {
        // Cleanup previous previews if replacing
        images.forEach((media) => {
          if (media.preview.startsWith('blob:')) {
            URL.revokeObjectURL(media.preview);
            blobUrlsRef.current.delete(media.preview);
          }
        });
        onImagesChange(newImages);
      }
    },
    [images, multiple, onImagesChange, createPreview]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      // Reset input to allow selecting the same file again
      e.target.value = '';
    },
    [processFiles]
  );

  const handleRemoveImage = useCallback(
    (id: string) => {
      const imageToRemove = images.find((img) => img.id === id);
      if (imageToRemove && imageToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.preview);
        blobUrlsRef.current.delete(imageToRemove.preview);
      }
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openFolderDialog = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        {multiple ? t('uploadGedImagesLabel') : t('uploadGedImageLabel')}
        {!multiple && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_MEDIA}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        aria-label={multiple ? t('uploadGedImagesLabel') : t('uploadGedImageLabel')}
      />

      {/* Folder input (hidden, webkitdirectory) */}
      {allowFolder && (
        <input
          ref={folderInputRef}
          type="file"
          accept={ACCEPT_MEDIA}
          {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
          aria-label={t('uploadGedFolderLabel')}
        />
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-neutral-300 bg-neutral-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onClick={!disabled ? openFileDialog : undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openFileDialog();
          }
        }}
        aria-label={multiple ? t('uploadGedImagesLabel') : t('uploadGedImageLabel')}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <svg
            className="w-12 h-12 text-neutral-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-neutral-600 mb-1">
            {isDragging
              ? t('uploadGedDropHere')
              : multiple
                ? t('uploadGedDragMultipleImages')
                : t('uploadGedDragImage')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              disabled={disabled}
              className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
            >
              {multiple ? t('uploadGedSelectImages') : t('uploadGedSelectImage')}
            </button>
            {allowFolder && (
              <>
                <span className="text-neutral-400">|</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFolderDialog();
                  }}
                  disabled={disabled}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  {t('uploadGedSelectFolder')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Media previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {images.map((media) => (
            <div key={media.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-neutral-200 bg-neutral-100">
                {media.mediaType === 'video' ? (
                  <video
                    src={media.preview}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={media.preview}
                    alt={media.file.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {multiple && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(media.id)}
                  disabled={disabled}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold hover:bg-red-600 disabled:opacity-50"
                  aria-label={t('uploadGedRemoveImage')}
                >
                  ×
                </button>
              )}
              <p className="text-xs text-neutral-600 mt-1 truncate" title={media.file.name}>
                {media.file.name}
              </p>
              <p className="text-xs text-neutral-400">
                {(media.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Image count */}
      {images.length > 0 && (
        <p className="text-sm text-neutral-500">
          {t('uploadGedImageCount', { count: images.length })}
        </p>
      )}
    </div>
  );
};
