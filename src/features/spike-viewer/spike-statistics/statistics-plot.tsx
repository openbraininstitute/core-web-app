'use client';

import Plotly from 'plotly.js-dist-min';
import { useEffect, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { usePlotListeners } from '@/features/sonata-viewer/hooks/use-plot-listeners';

import type { Config } from 'plotly.js-dist-min';
import type { Figure, PlotTooltip } from '@/features/spike-viewer/spike-statistics/figures';

const Plot = createPlotlyComponent(Plotly);

const CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  displayModeBar: 'hover',
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
 * each draws. `onPointClick` is told the `customdata` of a point clicked.
 */
export default function StatisticsPlot({
  figure,
  onPointClick,
}: {
  figure: Figure;
  onPointClick?: (customdata: unknown) => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; flip: boolean; card: PlotTooltip }>();
  const attachListeners = usePlotListeners({
    onClick: (event) => onPointClick?.(event.points[0]?.customdata),
    onHover: (event) => {
      const point = event.points[0];
      const card = point && figure.tooltip?.(point);
      const box = boxRef.current?.getBoundingClientRect();
      const mouse = event.event as MouseEvent | undefined;
      if (!card || !box || !mouse) {
        setTip(undefined);
        return;
      }
      const x = mouse.clientX - box.left;
      setTip({ x, y: mouse.clientY - box.top, flip: x > box.width * 0.6, card });
    },
    onUnhover: () => setTip(undefined),
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
    <div ref={boxRef} className="relative h-full w-full">
      <Plot
        data={figure.data}
        layout={figure.layout}
        config={CONFIG}
        useResizeHandler
        onInitialized={attachListeners}
        onUpdate={attachListeners}
        style={{ width: '100%', height: '100%' }}
      />
      {tip && figure.tooltip && <TooltipCard {...tip} />}
    </div>
  );
}

/** Beside the pointer, on the side with room, and out of its way. */
function TooltipCard({
  x,
  y,
  flip,
  card,
}: {
  x: number;
  y: number;
  flip: boolean;
  card: PlotTooltip;
}) {
  return (
    <div
      className="border-neutral-2 pointer-events-none absolute z-20 min-w-36 rounded-xl border bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
      style={{ left: x, top: y, translate: `${flip ? 'calc(-100% - 14px)' : '14px'} -50%` }}
    >
      <div className="flex items-center gap-2">
        {card.swatch && (
          <span className="size-2 shrink-0 rounded-full" style={{ background: card.swatch }} />
        )}
        <span className="text-primary-9 truncate text-xs font-semibold">{card.title}</span>
        {card.note && (
          <span className="ml-auto pl-3 text-[11px] whitespace-nowrap text-neutral-400">
            {card.note}
          </span>
        )}
      </div>
      {card.subtitle && <div className="mt-0.5 text-[11px] text-neutral-400">{card.subtitle}</div>}
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[11px]">
        {card.rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-neutral-500">{row.label}</dt>
            <dd
              className={
                row.strong
                  ? 'text-primary-9 text-right font-semibold tabular-nums'
                  : 'text-right text-neutral-700 tabular-nums'
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
