'use client';

/**
 * A course's canvas figure, carried from slide to slide: given its slide's
 * step, it works out the picture for that step `t` ms in — a pose of numbers —
 * eases into it from the one last drawn, and draws it; over the page, behind
 * the words, when the spill setting is on, as the walkthrough's other figures
 * do. A slide come back to starts at its finished picture.
 */

import { useContext, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useCanvasFrame } from '@/features/learn/components/basics/useCanvasFrame';
import { useSpillRoot } from '@/features/learn/components/basics/useSpillRoot';
import { Embedded } from '@/features/learn/components/embedded';
import { smooth } from '@/features/learn/components/heuristics/shared';
import { savedSpill, subscribe } from '@/features/learn/lib/settings';

import {
  blend,
  fadeEdges,
  type Look,
  lookOf,
  placeFrame,
  type Room,
  roomOf,
  type Seen,
  seenOf,
} from './canvas';

export interface Frame<S extends string> {
  ctx: CanvasRenderingContext2D;
  step: S;
  /** ms into the step, Infinity with reduced motion; and ms since the page opened, for what keeps moving. */
  t: number;
  now: number;
  room: Room;
  look: Look;
  seen: Seen;
  w: number;
  h: number;
  /** How far the ease from the last step's picture has got (1 once there). */
  k: number;
  still: boolean;
}

export default function StepCanvas<S extends string, P>({
  step,
  back,
  label,
  pose,
  draw,
  done = 9000,
  blendMs = 1100,
}: {
  step: S;
  back: boolean;
  label: string;
  pose: (step: S, t: number, room: Room, look: Look) => P;
  draw: (frame: Frame<S>, pose: P) => void;
  /** When every step's picture is finished, ms: shown at once on a slide come back to. */
  done?: number;
  blendMs?: number;
}) {
  // over the page only within a course: outside one, it keeps to its box
  const embedded = useContext(Embedded);
  const spill = useSyncExternalStore(subscribe, savedSpill, () => false) && !embedded;
  const frame = useRef<HTMLDivElement | null>(null);
  const spillRoot = useSpillRoot(frame, spill);
  const seen = useRef<Seen>(seenOf());
  const run = useRef<{ step: S; first: number; t0: number } | null>(null);
  const drawn = useRef<P | null>(null);
  const from = useRef<{ pose: P; at: number } | null>(null);

  const canvasRef = useCanvasFrame((ctx, cw, ch, now) => {
    const box = spill ? frame.current?.getBoundingClientRect() : null;
    const [w, h] = placeFrame(ctx, seen.current, cw, ch, box);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (run.current?.step !== step) {
      run.current = { step, first: now, t0: back ? done : 0 };
      if (drawn.current) from.current = { pose: drawn.current, at: now };
    }
    const t = still ? Infinity : run.current.t0 + now - run.current.first;
    const room = roomOf(seen.current, w, h);
    const look = lookOf();
    let p = pose(step, t, room, look);
    let k = 1;
    if (from.current) {
      k = still ? 1 : smooth((now - from.current.at) / blendMs);
      if (k >= 1) from.current = null;
      else p = blend(from.current.pose, p, k);
    }
    drawn.current = p;
    draw({ ctx, step, t, now: still ? 0 : now, room, look, seen: seen.current, w, h, k, still }, p);
    if (box) fadeEdges(ctx, seen.current, box, frame.current);
  });

  // outside a course, as tall as the card that holds it asks (--learn-figure-h), 340px if it does not
  const boxClass = embedded
    ? 'h-(--learn-figure-h,340px) w-full rounded-xl'
    : 'h-[340px] w-full rounded-xl';
  return (
    <div className="relative flex w-full flex-1 flex-col">
      {/* the space above the figure in a course; outside one, on the Learn page's card, none */}
      {!embedded && <div className="min-h-[12px] flex-1" />}
      {spill ? (
        <>
          <div ref={frame} role="img" aria-label={label} className={boxClass} />
          {spillRoot &&
            createPortal(
              // biome-ignore lint/a11y/noAriaHiddenOnFocusable: drawn behind the words, never focused
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
              />,
              // into the course's root, which stacks its own layers: behind its words, and in front of its page
              spillRoot
            )}
        </>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={label} className={boxClass} />
      )}
      <div className="flex-1" />
    </div>
  );
}
