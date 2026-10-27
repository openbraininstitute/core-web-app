'use client';

import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

/** How long the hint stays up: Plotly's own "long" notice. */
const HINT_MS = 3000;

/** The kinds of plot whose hint has been shown on this page: each once, as Plotly shows its own. */
const hinted = new Set<string>();

/**
 * Plotly's "Double-click to zoom back out", but over the plot zoomed rather
 * than at the page's top right, where it reads as nothing to do with it: shown
 * the first time a plot of `kind` is zoomed. Plotly's own is turned off with
 * `showTips: false`. Returns whether it is up, the call each zoom makes, and
 * the call a zoom back out makes, which takes it down: it has been heeded.
 */
export function useZoomHint(kind: string): [boolean, () => void, () => void] {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), HINT_MS);
    return () => clearTimeout(timer);
  }, [visible]);
  const zoomed = useCallback(() => {
    if (hinted.has(kind)) return;
    hinted.add(kind);
    setVisible(true);
  }, [kind]);
  const zoomedOut = useCallback(() => setVisible(false), []);
  return [visible, zoomed, zoomedOut];
}

/** Whether a Plotly relayout sets an axis's range: a zoom, or a pan, which a double-click undoes too. */
export function setsAxisRange(event: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(event).some((key) => /^[xy]axis\d*\.range/.test(key));
}

/** The hint, at the top of the box it is in, which is laid out `relative`. */
export function ZoomHint({ visible, className }: { visible: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-800/90 px-3 py-1 text-xs font-medium whitespace-nowrap text-white shadow-md transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      Double-click to zoom back out
    </div>
  );
}
