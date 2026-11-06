'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type StageProps<S extends string> = {
  scene: S;
  active: boolean;
  draw: (scene: S) => ReactNode;
  full?: (scene: S) => boolean;
  passThrough?: (scene: S) => boolean;
};

/** Media lives in the same scrolling section as the text, without a separate animation clock. */
export function SlidingStage<S extends string>({
  scene,
  active,
  draw,
  full,
  passThrough,
}: StageProps<S>) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    // Neighbouring screens stay mounted for scrolling, but must not decode and
    // play movies in the background on a phone. The active playback hook owns play/pause.
    const syncMedia = () => {
      for (const video of host.querySelectorAll('video')) {
        video.autoplay = active;
        if (!active) video.pause();
      }
    };
    syncMedia();
    const observer = new MutationObserver(syncMedia);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);
  return (
    <div
      ref={root}
      data-stage-current={active}
      data-stage-scene={scene}
      className={cn(
        full?.(scene)
          ? 'absolute inset-0'
          : 'absolute inset-x-0 top-0 h-[55%] beside:inset-y-0 beside:left-auto beside:h-full beside:w-[62%]',
        !active || passThrough?.(scene) ? 'pointer-events-none' : 'pointer-events-auto'
      )}
      inert={!active || undefined}
    >
      {draw(scene)}
    </div>
  );
}
