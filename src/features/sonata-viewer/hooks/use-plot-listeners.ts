import { useCallback, useLayoutEffect, useRef } from 'react';

import type { PlotlyHTMLElement, PlotMouseEvent, PlotRelayoutEvent } from 'plotly.js-dist-min';

export type TimeRange = [number, number];

export type PlotListeners = {
  onRelayout?: (event: Readonly<PlotRelayoutEvent>) => void;
  onDoubleClick?: () => void;
  onClick?: (event: Readonly<PlotMouseEvent>) => void;
};

/**
 * Plotly listeners that survive the plot being purged, as a figure callback for
 * `onInitialized` and `onUpdate`.
 *
 * react-plotly attaches its `on*` props once and re-attaches them only when
 * their identity changes. A purge in between - React's strict-mode remount does
 * one - drops them from the graph, and with the compiler keeping the handlers'
 * identity they never come back. So they are attached here instead, again
 * whenever the graph has a new emitter, and call whatever was passed last.
 */
export function usePlotListeners(listeners: PlotListeners) {
  const latest = useRef(listeners);
  useLayoutEffect(() => {
    latest.current = listeners;
  });
  const attachedTo = useRef<unknown>(null);
  return useCallback((_figure: unknown, graph: Readonly<HTMLElement>) => {
    const gd = graph as PlotlyHTMLElement;
    if (typeof gd.on !== 'function' || attachedTo.current === gd.on) return;
    attachedTo.current = gd.on;
    gd.on('plotly_relayout', (event) => latest.current.onRelayout?.(event));
    gd.on('plotly_doubleclick', () => latest.current.onDoubleClick?.());
    gd.on('plotly_click', (event) => latest.current.onClick?.(event));
  }, []);
}
