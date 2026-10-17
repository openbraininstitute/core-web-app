'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';

import { learnRoot } from '@/features/learn/lib/settings';

/**
 * Where a figure drawn over the page puts its canvas: the course root its box sits in. Found once the
 * box is in the page, not while rendering: on a course opened from another page, the root looked up
 * then is the old page's, on its way out, or none, and the canvas went behind the page, unseen.
 */
export function useSpillRoot(frame: RefObject<HTMLElement | null>, spill: boolean) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!spill) return setRoot(null);
    setRoot(
      frame.current?.closest<HTMLElement>('[data-learn-root]') ?? learnRoot() ?? document.body
    );
  }, [frame, spill]);
  return root;
}
