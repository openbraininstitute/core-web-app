import { FullscreenOutlined } from '@ant-design/icons';
import { tgdFullscreenToggle } from '@bbp/morphoviewer';
import Plotly from 'plotly.js-dist-min';
import React from 'react';

import {
  PLOT_CONFIG,
  PLOT_LAYOUT,
} from '@/features/entities/neuron-simulation/experiment/visualization/layout-config';
import { PlotInstance } from '@/features/entities/neuron-simulation/experiment/visualization/plots-parser';
import { classNames } from '@/util/utils';

import styles from '@/features/entities/neuron-simulation/experiment/visualization/multi-plots-view/multi-plots-view.module.css';

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
  const [disabledLines, setDisabledLines] = React.useState<string[]>([]);
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
    delete layout.height;
    Plotly.newPlot(container, data, layout, PLOT_CONFIG);
  }, [instance, disabledLines]);
  const handleFullscreen = () => {
    const container = refContainer.current;
    tgdFullscreenToggle(container, { navigationUI: 'show' });
  };
  const toggleLine = (name: string) => {
    if (disabledLines.includes(name)) {
      setDisabledLines(disabledLines.filter((item) => item !== name));
    } else {
      setDisabledLines([name, ...disabledLines]);
    }
  };
  const enableOnlyOne = (name: string) => {
    const newDisabledLines = instance.lines
      .map((line) => line.name)
      .filter((item) => item !== name);
    setDisabledLines(newDisabledLines);
  };

  return (
    <div className={styles.plotContainer} ref={refContainer}>
      {instance.title && <h2>{instance.title}</h2>}
      <div className={styles.legend}>
        {instance.lines.map((line) => (
          <button
            key={line.name}
            type="button"
            style={{
              '--custom-color': line.color,
              opacity: disabledLines.includes(line.name) ? 0.5 : 1,
            }}
            onClick={() => toggleLine(line.name)}
            onDoubleClick={(evt: React.MouseEvent) => {
              evt.preventDefault();
              evt.stopPropagation();
              enableOnlyOne(line.name);
            }}
          >
            {line.name}
          </button>
        ))}
      </div>
      <div ref={refPlot} className={styles.plot} />
      <button type="button" onClick={handleFullscreen}>
        <FullscreenOutlined />
      </button>
    </div>
  );
}
