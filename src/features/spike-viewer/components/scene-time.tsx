'use client';

import { useCallback, useRef } from 'react';

import type { RefObject } from 'react';

const format = (timeInMs: number) => `${timeInMs.toFixed(1)} ms`;

/**
 * The player's time over a 3D view, in its corner: written by the clock on every
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

/**
 * Where the time sits: in the view's top left corner, just right of the viewer's
 * settings button (28 px square, 11 px in) and level with it.
 */
export function SceneTime({ labelRef }: { labelRef: (element: HTMLSpanElement | null) => void }) {
  return (
    <span
      ref={labelRef}
      className="pointer-events-none absolute top-[25px] left-[47px] z-10 -translate-y-1/2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-[#f5222d] tabular-nums shadow-sm ring-1 ring-black/5"
    />
  );
}
