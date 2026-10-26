'use client';

import { RiPauseFill, RiPlayFill } from '@remixicon/react';
import { useCallback, useRef } from 'react';

import { ChromeButton } from '@/features/scan-config/components/color-by/chrome-button';
import { TIME_CURSOR_COLOR } from '@/features/sonata-viewer/time-cursor';

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
 * Where the time sits: in the view's top left corner, beside the viewer's
 * settings button (28 px square, 11 px in), after a play button of the same
 * kind that plays and pauses the player.
 */
export function SceneTime({
  labelRef,
  playing,
  onPlayingChange,
}: {
  labelRef: (element: HTMLSpanElement | null) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
}) {
  return (
    <div className="pointer-events-none absolute top-[11px] left-[47px] z-10 flex items-center gap-2">
      <span className="pointer-events-auto">
        <ChromeButton label={playing ? 'Pause' : 'Play'} onClick={() => onPlayingChange(!playing)}>
          {playing ? <RiPauseFill className="size-4" /> : <RiPlayFill className="size-4" />}
        </ChromeButton>
      </span>
      <span
        ref={labelRef}
        className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm ring-1 ring-black/5"
        style={{ color: TIME_CURSOR_COLOR }}
      />
    </div>
  );
}
