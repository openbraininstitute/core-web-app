import { Empty } from 'antd';
import Plotly, { Config, Layout } from 'plotly.js-dist-min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import createPlotlyComponent from 'react-plotly.js/factory';

import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';
import { LTTB } from '@/util/explore-section/LTTB';

const Plot = createPlotlyComponent(Plotly);

const makePlotLayout = ({
  title,
  xTitle = 'Time [ms]',
  yTitle = 'Current [nA]',
}: {
  title: string;
  xTitle?: string;
  yTitle?: string;
}): Partial<Layout> => {
  return {
    title: {
      text: title,
      font: { color: '#003A8C' },
      x: 0.001,
      xref: 'paper',
      yref: 'paper',
      pad: { l: 0, r: 0, t: 20, b: 40 },
      // @ts-ignore
      automargin: true,
    },
    plot_bgcolor: '#fff',
    paper_bgcolor: '#fff',
    autosize: true,
    xaxis: {
      automargin: true,
      color: '#003A8C',
      zeroline: false,
      showline: true,
      linecolor: '#888888',
      title: { text: xTitle, standoff: 6 },
    },
    yaxis: {
      automargin: true,
      color: '#003A8C',
      zeroline: false,
      showline: true,
      linecolor: '#888888',
      title: { text: yTitle, standoff: 6 },
    },
    showlegend: true,
    margin: { t: 50, r: 20, b: 50, l: 60 },
  };
};

const makeConfig = (): Partial<Config> => ({
  displaylogo: false,
  staticPlot: true,
  responsive: true,
});

export default function SimulationPlot({
  title,
  yTitle,
  plotData,
}: {
  title?: string;
  yTitle?: string;
  plotData: PlotData;
}) {
  const [error, setError] = useState(false);
  const [plotRevision, setPlotRevision] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { ref: setInViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: '1200px',
  });

  const downsampledPlotData = useMemo(() => {
    return plotData.map((entry: PlotDataEntry) => {
      // Convert from {x: number[], y: number[]} to [[x, y], [x, y], ...] format
      const points: [number, number][] = entry.x.map((x, index) => [x, entry.y[index]]);

      // Apply LTTB downsampling
      const downsampledPoints = LTTB(points, 300) as [number, number][];

      // Convert back to original format
      return {
        ...entry,
        x: downsampledPoints.map(([x]) => x),
        y: downsampledPoints.map(([, y]) => y),
      };
    });
  }, [plotData]);

  useEffect(() => {
    if (containerRef.current) setInViewRef(containerRef.current);
  }, [containerRef, setInViewRef]);

  const onResize = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(containerRef, onResize);

  useEffect(() => {
    try {
      setError(false);
    } catch (err) {
      setError(true);
    }
  }, [plotData, title, yTitle]);

  if (error) {
    return <Empty description="Error while rendering plot" image={Empty.PRESENTED_IMAGE_DEFAULT} />;
  }

  if (!downsampledPlotData || downsampledPlotData.length === 0) {
    return <Empty description="No data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div ref={containerRef} className="aspect-16/9 w-full">
      {inView ? (
        <Plot
          data={downsampledPlotData}
          layout={{
            ...makePlotLayout({
              title: title ?? '',
              yTitle: yTitle ?? 'Voltage [mV]',
            }),
            datarevision: plotRevision,
          }}
          config={makeConfig()}
          className="h-full w-full"
          useResizeHandler
        />
      ) : null}
    </div>
  );
}
