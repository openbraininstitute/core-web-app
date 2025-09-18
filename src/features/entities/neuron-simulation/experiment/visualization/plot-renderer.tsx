'use client';

import { DownloadOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
import lodashSet from 'lodash/set';
import Plotly from 'plotly.js-dist-min';
import { useEffect, useRef, useState, useMemo } from 'react';
import { parsePlots } from './plots-groups';
import MultiPlotsView from './multi-plots-view';

import { PLOT_CONFIG, PLOT_LAYOUT } from './layout-config';
import LegendItem from '@/features/entities/neuron-simulation/experiment/visualization/legend-item';
import type { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';
import { exportSingleSimulationResultAsZip } from '@/util/simulation-plotly-to-csv';
import { classNames } from '@/util/utils';

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
  bordered?: boolean;
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
  bordered = false,
}: Props) {
  const refFullscreen = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [refreshLegend, setRefreshLegend] = useState(false);
  const plotInstances = useMemo(() => parsePlots(data), [data]);

  const onDownloadPlotDataCsv = () => {
    exportSingleSimulationResultAsZip({
      type,
      name: name ?? 'plots',
      result: data,
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    lodashSet(PLOT_LAYOUT, 'showlegend', Boolean(plotConfig?.showDefaultLegends));

    if (plotConfig?.yAxisTitle) {
      lodashSet(PLOT_LAYOUT, 'yaxis.title.text', plotConfig.yAxisTitle);
    }

    if (!initialized) {
      Plotly.newPlot(container, data, setYAxisTitle(PLOT_LAYOUT, data), PLOT_CONFIG);
      setInitialized(true);
    } else {
      Plotly.react(container, data, setYAxisTitle(PLOT_LAYOUT, data), PLOT_CONFIG);
    }

    // eslint-disable-next-line consistent-return
    return () => {
      Plotly.purge(container);
    };
  }, [data, initialized, plotConfig]);

  const isTraceVisible = (trace: PlotDataEntry) => trace.visible === undefined || trace.visible;
  const toggleTraceVisibility = (trace: PlotDataEntry, index: number) => {
    if (!containerRef.current) return;

    Plotly.restyle(containerRef.current!, { visible: !isTraceVisible(trace) }, [index]);
    setRefreshLegend((prev) => !prev);
  };
  const visibleTracesCount = data?.filter((t) => isTraceVisible(t)).length;

  return (
    <div className="relative mt-4 w-full px-3" ref={refFullscreen}>
      {!isLoading && data.length && !plotConfig?.showDefaultLegends && (
        <div className="py-4">
          <div className="flex w-full justify-between text-gray-400">
            <span className="text-base uppercase">Output Values</span>
            <span className="text-base">
              {visibleTracesCount}/{data.length} values displayed
            </span>
          </div>
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
      <div className="relative w-full p-2">
        <div className="flex items-center justify-between gap-4">
          {withTitle && title && (
            <div className="bg-primary-8 flex h-10 items-center justify-center px-4 py-2 text-base text-white">
              {title}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 self-end">
            {/* <Button
              type="primary"
              size="middle"
              htmlType="button"
              icon={<FullscreenOutlined />}
              onClick={onFullScreen}
              className={classNames(
                'border-primary-8 text-primary-8 h-10 rounded-none border bg-white',
                bordered && 'border-b-0'
              )}
            >
              Full screen
            </Button> */}
            {isDownloadable && !isLoading && (
              <>
                <Button
                  type="primary"
                  size="middle"
                  htmlType="button"
                  icon={<DownloadOutlined />}
                  onClick={onDownloadPlotDataCsv}
                  className={classNames(
                    'border-primary-8 text-primary-8 h-10 rounded-none border bg-white',
                    bordered && 'border-b-0'
                  )}
                >
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
        <div
          className={classNames(
            'relative flex h-full w-full flex-col items-center justify-center px-2 pt-8',
            bordered && 'border-primary-8 border'
          )}
        >
          <div className="h-full w-[calc(100%-2rem)]">
            <MultiPlotsView instances={plotInstances} />
            <hr />
            <div
              className={classNames(className, 'hfull w-full')}
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

/**
 * This function is used to provide backward compatibility.
 * In the old format returned by BlueNaas, we didin't have
 * neither `variable_name` nor `unit` attributes.
 * The `layout` was used to define the axis title and was
 * filled with a static text.
 * Now, if we have the new attributes, we use them to build
 * a more meaningful Y axis title.
 */
function setYAxisTitle(layout: Partial<Plotly.Layout>, data: PlotData): Partial<Plotly.Layout> {
  const lastItem = data?.at(-1);
  if (!lastItem?.variable_name || !lastItem?.unit) return layout;

  const correctedLayout = structuredClone(layout);
  if (!correctedLayout.yaxis) correctedLayout.yaxis = {};
  if (!correctedLayout.yaxis.title) correctedLayout.yaxis.title = {};
  const titleText = `${lastItem.variable_name} (${lastItem.unit})`;
  if (typeof correctedLayout.yaxis.title === 'string') {
    correctedLayout.yaxis.title = titleText;
  } else {
    correctedLayout.yaxis.title.text = titleText;
  }
  return correctedLayout;
}
