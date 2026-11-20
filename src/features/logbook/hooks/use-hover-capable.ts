'use client';

import { useEffect, useState } from 'react';

/** True only with a real hover (mouse, trackpad); a tap's sticky `:hover` doesn't count. */
export function useHoverCapable() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return canHover;
}
