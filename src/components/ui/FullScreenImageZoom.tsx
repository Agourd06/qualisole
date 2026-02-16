import React, { useCallback, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export interface FullScreenImageZoomProps {
  /** Image URL to display. */
  src: string;
  /** Alt text for the image. */
  alt?: string;
  /** Called when the user requests to close (e.g. close button). */
  onClose: () => void;
  /** Optional aria-label for the container. */
  ariaLabel?: string;
}

/**
 * Full-screen image viewer with fluid zoom, pan, and pinch-to-zoom.
 * Uses react-zoom-pan-pinch for gestures and Native Fullscreen API.
 */
export const FullScreenImageZoom: React.FC<FullScreenImageZoomProps> = ({
  src,
  alt = '',
  onClose,
  ariaLabel = 'Full screen image',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex  bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="relative w-full h-full">
  <TransformWrapper
    initialScale={1}
    minScale={0.5}
    maxScale={8}
    centerOnInit
    centerZoomedOut
    limitToBounds={false}
    doubleClick={{ mode: 'reset' }}
    wheel={{ step: 0.15 }}
  >

        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden" style={{ width: '100%', height: '100%' }}>
            <TransformComponent
  wrapperStyle={{
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'bottom',
    justifyContent: 'center',
  }}
  contentStyle={{
    display: 'flex',
    alignItems: 'bottom',
    justifyContent: 'center',
  }}
>
  <img
    src={src}
    alt={alt}
    className="max-w-full max-h-full object-contain select-none"
    draggable={false}
  />
</TransformComponent>

            </div>

            {/* Floating overlay controls */}
            <div className="absolute inset-x-0 top-4 z-20 flex items-center justify-center gap-2 px-4">
              <button
                type="button"
                onClick={() => zoomIn()}
                className="rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Zoom in"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                className="rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Zoom out"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                className="rounded-full bg-white/15 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={enterFullscreen}
                className="rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Enter fullscreen"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>

            {/* Close button - top right */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </TransformWrapper>
      </div>
    </div>
  );
};
