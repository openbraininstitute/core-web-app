'use client';

import { motion, useReducedMotion } from 'motion/react';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** How long a departed atlas box waits for the box that takes its place. */
const MORPH_WINDOW_MS = 1500;
/** Same spring as the Data panel's own grid animation. */
const MORPH_SPRING = { type: 'spring', stiffness: 320, damping: 30, mass: 0.6 } as const;

type TBox = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

let departed: { box: TBox; at: number } | null = null;

function toBox(el: HTMLElement): TBox {
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
}

/**
 * Records where the atlas box was when it goes (the full atlas giving way to a table,
 * or the small card giving way to the full atlas), for the box that replaces it.
 */
export function useAtlasMorphSource(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    return () => {
      const box = toBox(el);
      if (box.width && box.height) departed = { box, at: performance.now() };
    };
  }, [ref, enabled]);
}

/**
 * Flies a navy box from the departed atlas box onto `target`, which stays hidden until
 * it lands; the box then fades into it.
 */
export function AtlasMorph({ target }: { target: RefObject<HTMLElement | null> }) {
  const reduce = useReducedMotion();
  // undefined until this instance has looked for a departed box, so a Strict Mode
  // effect replay neither takes a second box nor drops the one it took
  const flightRef = useRef<{ from: TBox; to: TBox } | null | undefined>(undefined);
  const [flight, setFlight] = useState<{ from: TBox; to: TBox } | null>(null);
  const [landed, setLanded] = useState(false);

  useLayoutEffect(() => {
    const el = target.current;
    if (flightRef.current === undefined) {
      const source = departed;
      departed = null;
      flightRef.current =
        source && el && !reduce && performance.now() - source.at < MORPH_WINDOW_MS
          ? { from: source.box, to: toBox(el) }
          : null;
      if (flightRef.current) setFlight(flightRef.current);
    }
    if (!flightRef.current || landed || !el) return;
    el.style.opacity = '0';
    return () => {
      el.style.opacity = '';
    };
  }, [target, reduce, landed]);

  if (!flight) return null;
  return createPortal(
    <motion.div
      aria-hidden
      className="bg-primary-9 pointer-events-none fixed z-40 rounded-[16px]"
      initial={flight.from}
      animate={landed ? { ...flight.to, opacity: 0 } : flight.to}
      transition={landed ? { duration: 0.15 } : MORPH_SPRING}
      onAnimationComplete={() => (landed ? setFlight(null) : setLanded(true))}
    />,
    document.body
  );
}
