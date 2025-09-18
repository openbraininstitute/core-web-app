'use client';

import { DownloadOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
import { useMemo } from 'react';

import { parsePlots } from './plots-parser';
import MultiPlotsView from './multi-plots-view';
import type { PlotData } from '@/services/bluenaas-single-cell/types';
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
  name,
  type,
  data,
  isLoading,
  withTitle,
  title,
  isDownloadable = false,
  // onlyAmplitudeLegend = true,
  bordered = false,
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
    <div className="relative mt-4 w-full px-3">
      <div className="relative w-full p-2">
        <div className="flex items-center justify-between gap-4">
          {withTitle && title && (
            <div className="bg-primary-8 flex h-10 items-center justify-center px-4 py-2 text-base text-white">
              {title}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 self-end">
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
            {isLoading && (
              <div className="flex w-full justify-center p-8">
                <Spin size="large" />
              </div>
            )}
            <MultiPlotsView instances={plotInstances} />
          </div>
        </div>
      </div>
    </div>
  );
}
