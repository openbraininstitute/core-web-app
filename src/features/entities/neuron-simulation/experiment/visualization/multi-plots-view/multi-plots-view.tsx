import React from 'react';
import { FullscreenOutlined } from '@ant-design/icons';
import { tgdFullscreenToggle } from '@bbp/morphoviewer';
import Plotly from 'plotly.js-dist-min';

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
  maxTime: number;
}

export default function MultiPlotsView({ className, instances, maxTime }: MultiPlotsViewProps) {
  return (
    <div className={classNames(className, styles.multiPlotsView)}>
      {instances.map((instance, index) => {
        const key = instance.title ?? `Plot-${index}`;
        return <PlotView key={key} instance={instance} maxTime={maxTime} />;
      })}
    </div>
  );
}

function PlotView({ instance, maxTime }: { instance: PlotInstance; maxTime: number }) {
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
        line: {
          color: line.color,
        },
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
    layout.datarevision = performance.now();
    delete layout.height;
    Plotly.react(container, data, layout, PLOT_CONFIG);

    const observer = new ResizeObserver(() => {
      // Redraw the graph after resize
      Plotly.relayout(container, {});
    });
    observer.observe(container);
    return () => observer.unobserve(container);
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
  const progress = resolveProgress(instance, maxTime);

  return (
    <div className={styles.plotContainer} ref={refContainer}>
      {instance.title && <h2>{instance.title}</h2>}
      <div className={styles.legend}>
        {instance.lines.map((line) => (
          <button
            className={classNames(disabledLines.includes(line.name) && styles.disabled)}
            key={line.name}
            type="button"
            style={{
              '--custom-color': line.color,
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
      {progress < 100 && maxTime > 0 && (
        <div className={styles.streaming}>
          Streaming: <strong>{progress}</strong>%
        </div>
      )}
      <button type="button" onClick={handleFullscreen}>
        <FullscreenOutlined />
      </button>
    </div>
  );
}

function resolveProgress(instance: PlotInstance, maxTime: number): number {
  const time = instance.lines.reduce(
    (prv, cur) => Math.max(prv, cur.x.at(-1) ?? 0),
    Number.NEGATIVE_INFINITY
  );
  const percent = time >= maxTime ? 100 : Math.floor((100 * time) / maxTime);
  return percent;
}
