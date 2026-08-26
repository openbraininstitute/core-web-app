import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
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
  traceIndex,
  label,
  units,
  timeUnits,
  variableName,
  showTitle,
}: {
  worker: Remote<SonataWorkerImpl>;
  populationName: string;
  traceIndex: number;
  label: string;
  units: string;
  timeUnits: string;
  variableName?: string;
  showTitle?: boolean;
}) {
  const [data, setData] = useState<NodeTraceData | null>(null);
  const [zoomRange, setZoomRange] = useState<{
    x: (number | undefined)[];
    y: (number | undefined)[];
  } | null>(null);
  const { config, layout, font, style } = useInteractivePlotConfig(units, variableName, timeUnits);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '1200px',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLElement>(null);
  const onResize = useCallback(() => {
    if (plotRef.current) Plotly.Plots.resize(plotRef.current);
  }, []);
  useResizeObserver(containerRef, onResize);

  useEffect(() => {
    if (!inView) return;

    let cancelled = false;

    worker
      .getNodeTrace({
        populationName,
        traceIndex,
        desiredPoints: INTERACTIVE_DESIRED_POINTS,
        zoomRange: zoomRange ? { xStart: zoomRange.x[0], xEnd: zoomRange.x[1] } : undefined,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [inView, worker, populationName, traceIndex, zoomRange]);

  const title = `${populationName}_${label}`;

  if (!data) {
    return <div ref={inViewRef} className="h-[40vh] w-full" />;
  }

  const plotData: Partial<PlotData>[] = [
    {
      x: Array.from(data.x),
      y: Array.from(data.y),
      type: 'scatter',
      mode: 'lines',
      line: { color: CHART_LINE_COLOR, width: 1 },
      name: title,
    },
  ];

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        inViewRef(el);
      }}
      className="flex flex-col gap-1"
    >
      {showTitle && <span className="text-lg">{title}</span>}
      <Plot
        onInitialized={(_, graphDiv) => {
          plotRef.current = graphDiv;
        }}
        data={plotData}
        onRelayout={(e) => {
          // Autoscale and Reset axes emit autorange with no range keys.
          if (e['xaxis.autorange'] === true) {
            setZoomRange(null);
            return;
          }

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
        }}
        layout={{
          ...layout,
          title: showTitle ? title : undefined,
          xaxis: {
            ...layout.xaxis,
            title: { font, text: `Time (${timeUnits})` },
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
