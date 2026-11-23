import { isNil, isNotNil } from 'es-toolkit';
import { useLayoutEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import { LAYOUT_COMPACT_MIN, LAYOUT_WIDE_MIN } from '@/features/logbook/constants';
import { Layout } from '@/features/logbook/types';

import type { RefObject } from 'react';
import type { TLayout } from '@/features/logbook/types';

const layoutOf = (width: number): TLayout =>
  match(width)
    .with(P.number.gte(LAYOUT_WIDE_MIN), () => Layout.Wide)
    .with(P.number.gte(LAYOUT_COMPACT_MIN), () => Layout.Compact)
    .otherwise(() => Layout.Narrow);

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
