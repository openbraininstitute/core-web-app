import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { CHART_LINE_COLOR } from '@/features/sonata-viewer/constants';
import { useInteractivePlotConfig } from '@/features/sonata-viewer/hooks/config-hooks';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';

import type { Remote } from 'comlink';
import type { PlotData } from 'plotly.js-dist-min';
import type { NodeTraceData } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

const Plot = createPlotlyComponent(Plotly);

const INTERACTIVE_DESIRED_POINTS = 1000;

export default function InteractivePlot({
  worker,
  populationName,
  nodeId,
  units,
}: {
  worker: Remote<SonataWorkerImpl>;
  populationName: string;
  nodeId: number;
  units: string;
}) {
  const [data, setData] = useState<NodeTraceData | null>(null);
  const [zoomRange, setZoomRange] = useState<{
    x: (number | undefined)[];
    y: (number | undefined)[];
  } | null>(null);
  const { config, layout, font, style } = useInteractivePlotConfig(units);

  const containerRef = useRef<HTMLDivElement>(null);
  const onResize = useCallback(() => {
    const plotDiv = containerRef.current?.querySelector('.js-plotly-plot') as HTMLElement | null;
    if (plotDiv) Plotly.Plots.resize(plotDiv);
  }, []);
  useResizeObserver(containerRef, onResize);

  useEffect(() => {
    let cancelled = false;

    worker
      .getNodeTrace({
        populationName,
        nodeId,
        desiredPoints: INTERACTIVE_DESIRED_POINTS,
        zoomRange: zoomRange ? { xStart: zoomRange.x[0], xEnd: zoomRange.x[1] } : undefined,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      });

    return () => {
      cancelled = true;
    };
  }, [worker, populationName, nodeId, zoomRange]);

  if (!data) return null;

  const plotData: Partial<PlotData>[] = [
    {
      x: Array.from(data.x),
      y: Array.from(data.y),
      type: 'scatter',
      mode: 'lines',
      line: { color: CHART_LINE_COLOR, width: 1 },
      name: `${populationName}_${nodeId}`,
    },
  ];

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <span className="text-lg">
        {populationName}_{nodeId}
      </span>
      <Plot
        data={plotData}
        onRelayout={(e) => {
          const x1 = e['xaxis.range[0]'] as number | undefined;
          const x2 = e['xaxis.range[1]'] as number | undefined;
          const y1 = e['yaxis.range[0]'] as number | undefined;
          const y2 = e['yaxis.range[1]'] as number | undefined;

          if (x1 !== undefined || x2 !== undefined) {
            setZoomRange({ x: [x1, x2], y: [y1, y2] });
          }
        }}
        onDoubleClick={() => {
          setZoomRange(null);
          return false;
        }}
        layout={{
          ...layout,
          title: `${populationName}_${nodeId}`,
          xaxis: {
            ...layout.xaxis,
            title: { font, text: 'Time (ms)' },
            range: zoomRange?.x,
          },
          yaxis: {
            ...layout.yaxis,
            range: zoomRange?.y,
          },
        }}
        style={style}
        config={config}
      />
    </div>
  );
}
