import Plotly from 'plotly.js-dist-min';
import React from 'react';

import { PLOT_CONFIG, PLOT_LAYOUT } from '../layout-config';

import type { PlotInstance } from '../plots-parser';

export function usePlotly(
  refPlot: React.RefObject<HTMLDivElement | null>,
  instance: PlotInstance,
  disabledLines: string[]
) {
  React.useEffect(() => {
    const container = refPlot.current;
    if (!container) return;

    const data: Plotly.Data[] = instance.lines.map((line) => {
      const item: Plotly.Data = {
        x: line.x,
        y: line.y,
        name: line.name,
        line: {
          color: line.color,
        },
        visible: !disabledLines.includes(line.name),
      };
      return item;
    });
    const layout = structuredClone(PLOT_LAYOUT);
    if (!layout.xaxis) layout.xaxis = { title: instance.xaxis };
    else layout.xaxis.title = instance.xaxis;
    if (!layout.yaxis) layout.yaxis = { title: instance.yaxis };
    else layout.yaxis.title = instance.yaxis;
    layout.showlegend = false;
    layout.datarevision = performance.now();
    delete layout.height;
    Plotly.react(container, data, layout, PLOT_CONFIG);
  }, [instance, disabledLines, refPlot]);
}

export function useResizeObserver(refPlot: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const container = refPlot.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // Redraw the graph after resize
      Plotly.relayout(container, {});
    });
    observer.observe(container);
    return () => observer.unobserve(container);
  }, [refPlot]);
}
