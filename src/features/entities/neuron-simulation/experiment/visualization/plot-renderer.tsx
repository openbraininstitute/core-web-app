'use client';

import { DownloadOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
import { Layout } from 'plotly.js-dist-min';
import { ComponentProps, useMemo } from 'react';

import MultiPlotsView from '@/features/entities/neuron-simulation/experiment/visualization/multi-plots-view';
import { parsePlots } from '@/features/entities/neuron-simulation/experiment/visualization/plots-parser';
import type { PlotData } from '@/services/bluenaas-single-cell/types';
import { exportSingleSimulationResultAsZip } from '@/util/simulation-plotly-to-csv';
import { cn } from '@/utils/css-class';

type PlotConfig = {
  yAxisTitle?: string;
  showDefaultLegends?: boolean;
  maxTime?: number;
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
  name,
  type,
  data,
  isLoading,
  withTitle,
  title,
  plotConfig,
  isDownloadable = false,
  bordered = false,
  rootClassName,
  wrapperClassName,
  graphContainerClassName,
  graphWrapperClassName,
  titleClassName,
  downloadClassName,
}: Props) {
  const plotInstances = useMemo(() => parsePlots(data), [data]);

  const onDownloadPlotDataCsv = () => {
    exportSingleSimulationResultAsZip({
      type,
      name: name ?? 'plots',
      result: data,
    });
  };

  return (
    <div
      id={`root-container-${name}`}
      data-testid={`root-container-${name}`}
      className={cn('relative mt-4 w-full px-3', rootClassName)}
    >
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
                shape="round"
                variant="outlined"
                size="small"
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
            {(isLoading || plotInstances.length === 0) && (
              <div className="flex w-full justify-center p-8">
                <Spin size="large" />
              </div>
            )}
            <MultiPlotsView instances={plotInstances} maxTime={plotConfig?.maxTime ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
