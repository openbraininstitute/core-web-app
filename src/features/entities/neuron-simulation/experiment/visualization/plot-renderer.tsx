'use client';

import { ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import Plotly, { Config, Layout } from 'plotly.js-dist-min';
import { DownloadOutlined } from '@ant-design/icons';
import lodashSet from 'lodash/set';
import { Spin } from 'antd';

import LegendItem from '@/features/entities/neuron-simulation/experiment/visualization/legend-item';
import { exportSingleSimulationResultAsZip } from '@/util/simulation-plotly-to-csv';
import { Button } from '@/ui/molecules/button';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';

const PLOT_LAYOUT: Partial<Layout> = {
  plot_bgcolor: '#fff',
  paper_bgcolor: '#fff',
  autosize: true,
  xaxis: {
    automargin: true,
    color: '#003A8C',
    zeroline: false,
    showline: true,
    linecolor: '#888888',
    title: { text: 'Time [ms]', font: { size: 12 }, standoff: 6 },
  },
  yaxis: {
    automargin: true,
    color: '#003A8C',
    zeroline: false,
    showline: true,
    linecolor: '#888888',
    title: { text: 'Current [nA]', font: { size: 12 }, standoff: 6 },
  },
  showlegend: false,
  margin: { t: 20, r: 20, b: 20, l: 20 },
  legend: {
    orientation: 'h',
    yanchor: 'top',
    xanchor: 'center',
    x: 0.5,
    y: 1.15,
  },
};

const PLOT_CONFIG: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
  displaylogo: false,
};

type PlotConfig = {
  yAxisTitle?: string;
  showDefaultLegends?: boolean;
};

type BasicProps = {
  name?: string;
  type: 'stimulus' | 'simulation';
  data: PlotData;
  className?: string;
  isLoading?: boolean;
  plotConfig?: PlotConfig;
  isDownloadable?: boolean;
  onlyAmplitudeLegend?: boolean;
  showCountValues?: boolean;
  bordered?: boolean;
  plotLayout?: Partial<Layout>;
  rootClassName?: ComponentProps<'div'>['className'];
  wrapperClassName?: ComponentProps<'div'>['className'];
  graphContainerClassName?: ComponentProps<'div'>['className'];
  graphWrapperClassName?: ComponentProps<'div'>['className'];
  titleClassName?: ComponentProps<'div'>['className'];
  downloadClassName?: ComponentProps<'div'>['className'];
};

type Props =
  | (BasicProps & {
      withTitle: true;
      title: React.ReactNode;
    })
  | (BasicProps & {
      withTitle: false;
      title: null;
    });

export default function PlotRenderer({
  className,
  name,
  type,
  data,
  isLoading,
  plotConfig,
  withTitle,
  title,
  isDownloadable = false,
  onlyAmplitudeLegend = true,
  showCountValues = true,
  bordered = false,
  plotLayout = PLOT_LAYOUT,
  rootClassName,
  wrapperClassName,
  graphContainerClassName,
  graphWrapperClassName,
  titleClassName,
  downloadClassName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [refreshLegend, setRefreshLegend] = useState(false);

  const onDownloadPlotDataCsv = () => {
    exportSingleSimulationResultAsZip({
      type,
      name: name ?? 'plots',
      result: data,
    });
  };

  const handleResize = useCallback(() => {
    if (containerRef.current && initialized) {
      Plotly.relayout(containerRef.current, plotLayout);
    }
  }, [initialized, plotLayout]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    lodashSet(plotLayout, 'showlegend', Boolean(plotConfig?.showDefaultLegends));

    if (plotConfig?.yAxisTitle) {
      lodashSet(plotLayout, 'yaxis.title.text', plotConfig.yAxisTitle);
    }

    if (!initialized) {
      Plotly.newPlot(container, data, plotLayout, PLOT_CONFIG);
      setInitialized(true);
    } else {
      Plotly.react(container, data, plotLayout, PLOT_CONFIG);
    }

    // eslint-disable-next-line consistent-return
    return () => {
      Plotly.purge(container);
    };
  }, [data, initialized, plotConfig, plotLayout]);

  // Add resize observer to handle container size changes
  useEffect(() => {
    if (!containerRef.current || !initialized) return;

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [initialized, handleResize]);

  const isTraceVisible = (trace: PlotDataEntry) => trace.visible === undefined || trace.visible;
  const toggleTraceVisibility = (trace: PlotDataEntry, index: number) => {
    if (!containerRef.current) return;

    Plotly.restyle(containerRef.current!, { visible: !isTraceVisible(trace) }, [index]);
    setRefreshLegend((prev) => !prev);
  };
  const visibleTracesCount = data?.filter((t) => isTraceVisible(t)).length;

  return (
    <div
      id={`root-container-${name}`}
      data-testid={`root-container-${name}`}
      className={cn('relative mt-4 w-full px-3', rootClassName)}
    >
      {Boolean(!isLoading && data.length && !plotConfig?.showDefaultLegends) && (
        <div className="py-4">
          {showCountValues && (
            <div className="flex w-full justify-between text-gray-400">
              <span className="text-base uppercase">Output Values</span>
              <span className="text-base">
                {visibleTracesCount}/{data.length} values displayed
              </span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {data.map((trace, index) => (
              <LegendItem
                key={`${trace.name}-${refreshLegend}`}
                trace={trace}
                toggleVisibility={() => toggleTraceVisibility(trace, index)}
                isVisible={isTraceVisible(trace)}
                onlyAmplitude={onlyAmplitudeLegend}
              />
            ))}
          </div>
        </div>
      )}
      <div className={cn('relative w-full p-2', wrapperClassName)}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
          {withTitle && title && (
            <div
              className={cn(
                'text-primary-9 flex h-10 items-center justify-center px-4 py-2 text-2xl font-bold',
                titleClassName
              )}
            >
              {title}
            </div>
          )}
          <div className="flex items-center gap-2">
            {isDownloadable && !isLoading && (
              <Button
                rounded
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownloadPlotDataCsv}
                className={cn(
                  'border-neutral-2 text-primary-8 rounded-none border bg-white',
                  { 'border-b-0': bordered },
                  downloadClassName
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="mr-5">Download</div>
                  <DownloadOutlined />
                </div>
              </Button>
            )}
          </div>
        </div>
        <div
          id={`graph-container-${name}`}
          className={cn(
            'relative flex h-full w-full flex-col items-center justify-center',
            { 'border-primary-8 border px-2 pt-8': bordered },
            graphContainerClassName
          )}
        >
          <div id={`graph-wrapper-${name}`} className={cn('h-full w-full', graphWrapperClassName)}>
            <div
              className={classNames(className, 'w-full')}
              ref={containerRef}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
            {isLoading && (
              <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center text-sm text-gray-500">
                <Spin size="large" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
