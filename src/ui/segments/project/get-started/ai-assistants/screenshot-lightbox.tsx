'use client';

import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine, RiZoomInLine } from '@remixicon/react';
import Image from 'next/image';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { TScreenshot } from './types';

const MAX_INLINE_HEIGHT = 560;

const LightboxContext = createContext<{
  screenshots: TScreenshot[];
  open: (index: number) => void;
} | null>(null);

/** Lets every screenshot inside it open in one shared full-screen viewer, and step to the others from there. */
export function ScreenshotLightbox({
  screenshots,
  children,
}: PropsWithChildren<{ screenshots: TScreenshot[] }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setIndex(i), []);
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback(
    (by: number) =>
      setIndex((i) => (i === null ? i : (i + by + screenshots.length) % screenshots.length)),
    [screenshots.length]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (index !== null && dialog && !dialog.open) dialog.showModal();
  }, [index]);

  const isOpen = index !== null;
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  });

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const context = useMemo(() => ({ screenshots, open }), [screenshots, open]);
  const current = index === null ? null : screenshots[index];

  return (
    <LightboxContext.Provider value={context}>
      {children}
      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        aria-label={current?.caption}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={close}
          className="absolute inset-0 cursor-default"
        />
        {current && index !== null && (
          <div className="pointer-events-none relative flex h-full w-full flex-col items-center justify-center gap-4 p-6 sm:p-10">
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              width={current.width * 2}
              height={current.height * 2}
              className="pointer-events-auto h-auto max-h-[calc(100dvh-9rem)] w-auto max-w-full rounded-lg bg-white shadow-2xl"
              unoptimized
            />
            <p className="pointer-events-auto max-w-3xl text-center text-sm text-white">
              <span className="mr-2 text-white/60">
                {index + 1} / {screenshots.length}
              </span>
              {current.caption}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25"
        >
          <RiCloseLine className="size-6" />
        </button>
        {screenshots.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous screenshot"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25"
            >
              <RiArrowLeftSLine className="size-7" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next screenshot"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25"
            >
              <RiArrowRightSLine className="size-7" />
            </button>
          </>
        )}
      </dialog>
    </LightboxContext.Provider>
  );
}

/** One screenshot on the page, at its own size or smaller, that opens enlarged when clicked. */
export function LightboxScreenshot({ index }: { index: number }) {
  const context = useContext(LightboxContext);
  if (!context) throw new Error('LightboxScreenshot must be inside ScreenshotLightbox');
  const shot = context.screenshots[index];

  return (
    <button
      type="button"
      onClick={() => context.open(index)}
      aria-label={`Enlarge: ${shot.alt}`}
      className="group relative max-w-full cursor-zoom-in rounded-lg"
      style={{ width: Math.min(shot.width, (shot.width * MAX_INLINE_HEIGHT) / shot.height) }}
    >
      <Image
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        className="h-auto w-full rounded-lg border border-neutral-200 shadow-sm transition-shadow group-hover:shadow-md"
        unoptimized
      />
      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <RiZoomInLine className="size-3.5" />
        Enlarge
      </span>
    </button>
  );
}
