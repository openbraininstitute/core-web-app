'use client';

import { useCallback, useRef } from 'react';

import type { RefObject } from 'react';

const format = (timeInMs: number) => `${timeInMs.toFixed(1)} ms`;

/**
 * The player's time over a 3D view, at its foot: written by the clock on every
 * frame rather than rendered, as the raster's playhead label is. Returns the
 * label's ref, which writes the time it last heard as it mounts, and `show`
 * for the clock to call.
 */
export function useSceneTime(timeRef: RefObject<number>) {
  const label = useRef<HTMLSpanElement | null>(null);
  const ref = useCallback(
    (element: HTMLSpanElement | null) => {
      label.current = element;
      if (element) element.textContent = format(timeRef.current);
    },
    [timeRef]
  );
  const show = useCallback((timeInMs: number) => {
    if (label.current) label.current.textContent = format(timeInMs);
  }, []);
  return { ref, show };
}

/** Where the time sits: centred at the foot of the view, between its scale bar and its axes. */
export function SceneTime({ labelRef }: { labelRef: (element: HTMLSpanElement | null) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
      <span
        ref={labelRef}
        className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-[#f5222d] tabular-nums shadow-sm ring-1 ring-black/5"
      />
    </div>
  );
}
