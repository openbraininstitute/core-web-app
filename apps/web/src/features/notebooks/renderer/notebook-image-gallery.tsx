'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import type { Variants } from 'motion/react';
import type { NotebookImage } from '../hooks/use-notebook-images';

// directional slide + crossfade when the active figure changes; `direction` is
// +1 when moving forward, -1 when moving back. Purely opacity/transform so it
// stays on the GPU. Reduced-motion users get a plain crossfade (no travel).
const slideVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -32 : 32 }),
};

/**
 * Image gallery for notebook results: a centered active image with prev/next
 * arrows and a thumbnail strip. Images come from the notebook's embedded
 * outputs (see {@link extractNotebookImages}). The active figure slides +
 * crossfades in the direction of navigation.
 */
export function NotebookImageGallery({
  images,
  className,
  name,
}: {
  images: NotebookImage[];
  className?: string;
  /** used for accessible alt text */
  name?: string;
}) {
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const reduceMotion = useReducedMotion();
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const total = images.length;
  // clamp when the underlying notebook changes and the list shrinks
  const active = Math.min(index, Math.max(total - 1, 0));

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      const wrapped = (next + total) % total;
      setState(([current]) => [wrapped, Math.sign(wrapped - current) || 0]);
    },
    [total]
  );

  const goPrev = useCallback(() => goTo(active - 1), [goTo, active]);
  const goNext = useCallback(() => goTo(active + 1), [goTo, active]);

  // keep the active thumbnail visible as the selection moves
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    strip
      .querySelector<HTMLElement>(`[data-thumb-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  if (total === 0) return null;

  const current = images[active];
  const hasMultiple = total > 1;
  const altBase = name ? `${name} — figure` : 'Notebook figure';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={name ? `${name} figures` : 'Notebook figures'}
      className={cn('flex flex-col items-center gap-3', className)}
      data-testid="notebook-image-gallery"
    >
      {/** biome-ignore lint/a11y/useSemanticElements: we need to use a group for the arrow buttons */}
      <div
        className="group relative w-full overflow-hidden rounded-lg bg-white"
        // fixed viewport so tall/short figures don't reflow the drawer
        style={{ height: 260 }}
        onKeyDown={(e) => {
          if (!hasMultiple) return;
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            goPrev();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            goNext();
          }
        }}
        tabIndex={hasMultiple ? 0 : -1}
        role="group"
        aria-label={`Figure ${active + 1} of ${total}`}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current.src}
            className="absolute inset-0"
            custom={direction}
            variants={reduceMotion ? undefined : slideVariants}
            initial={reduceMotion ? { opacity: 0 } : 'enter'}
            animate={reduceMotion ? { opacity: 1 } : 'center'}
            exit={reduceMotion ? { opacity: 0 } : 'exit'}
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 32 },
              opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            }}
          >
            <Image
              src={current.src}
              alt={`${altBase} ${active + 1} of ${total}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-contain p-2"
            />
          </motion.div>
        </AnimatePresence>

        {hasMultiple && (
          <>
            <GalleryArrow side="left" onClick={goPrev} />
            <GalleryArrow side="right" onClick={goNext} />
            <span
              className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white tabular-nums"
              aria-hidden
            >
              {active + 1} / {total}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex w-full items-center justify-center gap-2">
          <ThumbNavButton side="left" onClick={goPrev} />
          <div
            ref={thumbStripRef}
            className="primary-scrollbar flex justify-center gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Figure thumbnails"
          >
            {images.map((img, i) => (
              <button
                key={`${img.cellIndex}-${img.outputIndex}-${i}`}
                type="button"
                data-thumb-index={i}
                role="tab"
                aria-selected={i === active}
                aria-label={`Show figure ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  'relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors',
                  i === active
                    ? 'border-primary-5'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  unoptimized
                  sizes="56px"
                  className="object-contain"
                />
              </button>
            ))}
          </div>
          <ThumbNavButton side="right" onClick={goNext} />
        </div>
      )}
    </section>
  );
}

/** overlay arrow on the main image — revealed on hover/focus */
function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous figure' : 'Next figure'}
      className={cn(
        'absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full',
        'bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/65',
        'group-hover:opacity-100 focus-visible:opacity-100',
        side === 'left' ? 'left-2' : 'right-2'
      )}
    >
      {side === 'left' ? <LeftOutlined /> : <RightOutlined />}
    </button>
  );
}

/** always-visible arrow flanking the thumbnail strip */
function ThumbNavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous figure' : 'Next figure'}
      className={cn(
        'text-white hover:bg-neutral-2 flex h-7 w-7 shrink-0 items-center justify-center',
        'rounded-full bg-black/10 transition-colors hover:bg-white hover:text-primary-8'
      )}
    >
      {side === 'left' ? <LeftOutlined /> : <RightOutlined />}
    </button>
  );
}
