'use client';

import Plotly from 'plotly.js-dist-min';
import { useEffect, useRef } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { usePlotListeners } from '@/features/sonata-viewer/hooks/use-plot-listeners';

import type { Config } from 'plotly.js-dist-min';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';

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
  const attachListeners = usePlotListeners({
    onClick: (event) => onPointClick?.(event.points[0]?.customdata),
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
    <div ref={boxRef} className="h-full w-full">
      <Plot
        data={figure.data}
        layout={figure.layout}
        config={CONFIG}
        useResizeHandler
        onInitialized={attachListeners}
        onUpdate={attachListeners}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
