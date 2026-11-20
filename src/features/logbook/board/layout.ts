// Breakpoints come from the root element's width, not the window.
import { isNil, isNotNil } from 'es-toolkit';
import { useLayoutEffect, useState } from 'react';

import { Layout } from '@/features/logbook/types';

import type { RefObject } from 'react';
import type { TLayout } from '@/features/logbook/types';

const WIDE_MIN = 1180;
const COMPACT_MIN = 820;

export const layoutOf = (width: number): TLayout =>
  width >= WIDE_MIN ? Layout.Wide : width >= COMPACT_MIN ? Layout.Compact : Layout.Narrow;

// Re-render only when the layout band changes, not on every pixel.
export function useLayout(ref: RefObject<HTMLElement | null>): TLayout {
  const [layout, setLayout] = useState<TLayout>(() => layoutOf(innerWidth));
  useLayoutEffect(() => {
    const element = ref.current;
    if (isNil(element)) return;
    const observer = new ResizeObserver(([entry]) => {
      if (isNotNil(entry)) setLayout(layoutOf(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return layout;
}
