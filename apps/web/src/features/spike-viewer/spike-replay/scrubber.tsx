'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import { cn } from '@/utils/css-class';

type Props = {
  /** The span it scrubs, in ms. */
  from: number;
  to: number;
  /** Where that span starts and ends across the box it sits in, in px. */
  left: number;
  right: number;
  disabled?: boolean;
  /** The replay's clock, which the thumb is placed at whenever the span moves. */
  timeRef: React.RefObject<number>;
  /**
   * Filled in with a setter that moves the thumb, and cleared on unmount: the
   * replay calls it on every painted frame, as it moves the raster's playhead,
   * so the thumb keeps up without the tree re-rendering sixty times a second.
   */
  moveRef: React.RefObject<((timeInMs: number) => void) | null>;
  onSeek: (timeInMs: number) => void;
};

/** A scrubber under the raster's time axis: a rail, the played part, and a thumb. */
export function Scrubber({ from, to, left, right, disabled, timeRef, moveRef, onSeek }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const place = useCallback(
    (timeInMs: number) => {
      const share = to > from ? Math.min(1, Math.max(0, (timeInMs - from) / (to - from))) : 0;
      if (fillRef.current) fillRef.current.style.width = `${share * 100}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${share * 100}%`;
      boxRef.current?.setAttribute('aria-valuenow', timeInMs.toFixed(1));
    },
    [from, to]
  );
  useLayoutEffect(() => {
    moveRef.current = place;
    place(timeRef.current);
    return () => {
      moveRef.current = null;
    };
  }, [place, moveRef, timeRef]);

  const timeAt = (clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return from;
    const share = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    return from + share * (to - from);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    onSeek(timeAt(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) onSeek(timeAt(e.clientX));
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const span = to - from;
    const step = span * (e.shiftKey ? 0.1 : 0.01);
    const now = timeRef.current;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? now + step
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? now - step
          : e.key === 'Home'
            ? from
            : e.key === 'End'
              ? to
              : null;
    if (next === null) return;
    e.preventDefault();
    onSeek(Math.min(to, Math.max(from, next)));
  };

  return (
    <div
      ref={boxRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Replay time"
      aria-valuemin={from}
      aria-valuemax={to}
      // Kept up to date by `place` on every frame; a render starts it at the span's start.
      aria-valuenow={from}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        'group absolute top-1/2 h-6 -translate-y-1/2 touch-none outline-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
      style={{ left, width: right - left }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-neutral-200" />
      <div
        ref={fillRef}
        className="bg-primary-3 absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
      />
      <div
        ref={thumbRef}
        className={cn(
          'border-primary-6 absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white shadow-sm transition-[scale]',
          'group-hover:scale-110 group-focus-visible:ring-primary-3 group-focus-visible:ring-2'
        )}
      />
    </div>
  );
}
