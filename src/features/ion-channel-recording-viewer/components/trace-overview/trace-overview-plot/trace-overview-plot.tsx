import { FullscreenOutlined } from '@ant-design/icons';
import { tgdFullscreenToggle } from '@tolokoban/tgd';
import type { Data, Layout } from 'plotly.js-dist-min';
import React from 'react';
import { classNames } from '@/util/utils';
import type { IonChannelRecordingPlot } from '../../../ion-channel-recording-parser';
import { GenericPlot } from '../../generic-plot';

import styles from './trace-overview-plot.module.css';

export interface TraceOverviewPlotProps {
  className?: string;
  plot?: IonChannelRecordingPlot;
}

export function TraceOverviewPlot({ className, plot }: TraceOverviewPlotProps) {
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  return (
    <div className={classNames(className, styles.traceOverviewPlot)}>
      <div ref={refContainer} className={styles.container}>
        <GenericPlot className={styles.plot} data={plot} factory={plotlyParamsFactory} />
      </div>
      <button
        type="button"
        className={styles.buttonFullscreen}
        onClick={() => tgdFullscreenToggle(refContainer.current)}
      >
        <div>
          <FullscreenOutlined /> <div>See fullscreen</div>
        </div>
      </button>
    </div>
  );
}

function plotlyParamsFactory(plot: IonChannelRecordingPlot | undefined): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const data: Data[] = (plot?.lines ?? []).map((line) => {
    const LineData: Data = {
      mode: 'lines',
      x: line.x,
      y: line.y,
      name: line.id,
      opacity: 1,
      line: {
        width: 1,
        color: line.color,
      },
      marker: {
        size: 0,
        opacity: 0,
      },
    };

    return LineData;
  });
  const layout: Partial<Layout> = {
    showlegend: false,
    margin: { b: 32, t: 4, l: 64, r: 4 },
    xaxis: { title: plot?.xAxisLabel },
    yaxis: { title: plot?.yAxisLabel },
  };

  return { data, layout };
}
