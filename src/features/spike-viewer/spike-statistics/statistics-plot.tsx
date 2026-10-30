'use client';

import Plotly from 'plotly.js-dist-min';
import { useEffect, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { usePlotListeners } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import { PlotTimeline } from '@/features/spike-viewer/components/plot-timeline';
import { setsAxisRange, useZoomHint, ZoomHint } from '@/features/spike-viewer/components/zoom-hint';
import { TooltipCard } from '@/features/spike-viewer/spike-statistics/plot-tooltip';

import type { Config } from 'plotly.js-dist-min';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { Figure, HoverPoint } from '@/features/spike-viewer/spike-statistics/figures';
import type { PlacedTooltip } from '@/features/spike-viewer/spike-statistics/plot-tooltip';

const Plot = createPlotlyComponent(Plotly);

const CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  displayModeBar: 'hover',
  // Its zoom-out tip is ours, over the plot zoomed.
  showTips: false,
  modeBarButtonsToRemove: [
    'select2d',
    'lasso2d',
    'autoScale2d',
    'toggleSpikelines',
    'hoverClosestCartesian',
    'hoverCompareCartesian',
  ],
};

/**
 * One of the statistics' figures, filling its box; see `figures.ts` for what
 * each draws. `onPointClick` is told the `customdata` of a point clicked, and
 * `onPointHover` the point under the pointer, null once it leaves them. A
 * figure over time can carry the config's timings and the player's time over it.
 */
export default function StatisticsPlot({
  figure,
  onPointClick,
  onPointHover,
  timeline,
}: {
  figure: Figure;
  onPointClick?: (customdata: unknown) => void;
  onPointHover?: (point: HoverPoint | null) => void;
  timeline?: { events: readonly TimelineEvent[]; timeCursor?: TimeCursor };
}) {
  const [tip, setTip] = useState<PlacedTooltip>();
  const [graph, setGraph] = useState<HTMLElement | null>(null);
  // A timing's card over the plot's own, which gives way to it.
  const [timingHovered, setTimingHovered] = useState(false);
  // A 3D scene's hover says nothing of the pointer, so where it last was is kept.
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [hintUp, zoomed, zoomedOut] = useZoomHint('statistics');
  const attachListeners = usePlotListeners({
    onRelayout: (event) => {
      if (setsAxisRange(event as Readonly<Record<string, unknown>>)) zoomed();
    },
    onDoubleClick: zoomedOut,
    onClick: (event) => onPointClick?.(event.points[0]?.customdata),
    onHover: (event) => {
      const point = event.points[0] as HoverPoint | undefined;
      onPointHover?.(point ?? null);
      const card = point && figure.tooltip?.(point);
      const box = boxRef.current?.getBoundingClientRect();
      const mouse = event.event as MouseEvent | undefined;
      const at = mouse ? { x: mouse.clientX, y: mouse.clientY } : pointerRef.current;
      if (!card || !box || !at) {
        setTip(undefined);
        return;
      }
      // On the pointer's left past most of the plot, so it stays over the plot.
      const flip = at.x - box.left > box.width * 0.6;
      setTip({ clientX: at.x, clientY: at.y, flip, card });
    },
    onUnhover: () => {
      setTip(undefined);
      onPointHover?.(null);
    },
  });
  // react-plotly follows the window, not this box, which the grab bars around
  // the plot resize on their own.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const graph = box.querySelector<HTMLElement>('.js-plotly-plot');
      // Refuses a graph not on show; the next resize catches it up.
      if (graph) Promise.resolve(Plotly.Plots.resize(graph)).catch(() => {});
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full"
      onPointerMove={(e) => {
        pointerRef.current = { x: e.clientX, y: e.clientY };
      }}
      // Plotly can miss the way out of a mark on a quick move off the plot.
      onPointerLeave={onPointHover && (() => onPointHover(null))}
    >
      <Plot
        data={figure.data}
        layout={figure.layout}
        config={CONFIG}
        useResizeHandler
        onInitialized={(drawn, graphDiv) => {
          attachListeners(drawn, graphDiv);
          setGraph(graphDiv);
        }}
        onUpdate={attachListeners}
        style={{ width: '100%', height: '100%' }}
      />
      {timeline && (
        <PlotTimeline
          graph={graph}
          events={timeline.events}
          timeCursor={timeline.timeCursor}
          onHoverChange={setTimingHovered}
        />
      )}
      {tip && figure.tooltip && !timingHovered && <TooltipCard {...tip} />}
      <ZoomHint visible={hintUp} />
    </div>
  );
}
