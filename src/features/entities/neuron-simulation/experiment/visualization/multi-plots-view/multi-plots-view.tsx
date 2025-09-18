import React from 'react';
import Plotly from 'plotly.js-dist-min';
import { FullscreenOutlined } from '@ant-design/icons';
import { tgdFullscreenToggle } from '@bbp/morphoviewer';

import { PlotInstance } from '../plots-groups';
import { PLOT_CONFIG, PLOT_LAYOUT } from '../layout-config';
import { classNames } from '@/util/utils';

import styles from './multi-plots-view.module.css';

export interface MultiPlotsViewProps {
  className?: string;
  instances: PlotInstance[];
}

export default function MultiPlotsView({ className, instances }: MultiPlotsViewProps) {
  return (
    <div className={classNames(className, styles.multiPlotsView)}>
      {instances.map((instance, index) => {
        const key = instance.title ?? `Plot-${index}`;
        return <PlotView key={key} instance={instance} />;
      })}
    </div>
  );
}

function PlotView({ instance }: { instance: PlotInstance }) {
  const refPlot = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const container = refPlot.current;
    if (!container) return;

    const data: Plotly.Data[] = instance.lines.map((line) => {
      const item: Plotly.Data = {
        x: line.x,
        y: line.y,
        name: line.name,
        'line.color': line.color,
      };
      return item;
    });
    const layout = structuredClone(PLOT_LAYOUT);
    if (!layout.xaxis) layout.xaxis = { title: instance.xaxis };
    else layout.xaxis.title = instance.xaxis;
    if (!layout.yaxis) layout.yaxis = { title: instance.yaxis };
    else layout.yaxis.title = instance.yaxis;
    Plotly.newPlot(container, data, layout, PLOT_CONFIG);
  }, [instance]);
  const handleFullscreen = () => {
    const container = refContainer.current;
    tgdFullscreenToggle(container, { navigationUI: 'show' });
  };

  return (
    <div className={styles.plotContainer} ref={refContainer}>
      {instance.title && <h2>{instance.title}</h2>}
      <div ref={refPlot} className={styles.plot} />
      <button type="button" onClick={handleFullscreen}>
        <FullscreenOutlined />
      </button>
    </div>
  );
}
