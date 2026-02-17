import { FullscreenOutlined } from '@ant-design/icons';
import { tgdFullscreenToggle } from '@bbp/morphoviewer';
import React from 'react';

import { classNames } from '@/util/utils';

import { usePlotly, useResizeObserver } from './hooks';

import type { PlotInstance } from '@/features/entities/neuron-simulation/experiment/visualization/plots-parser';

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

  usePlotly(refPlot, instance, disabledLines);
  useResizeObserver(refPlot);
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
      <button type="button" onClick={handleFullscreen}>
        <FullscreenOutlined />
      </button>
    </div>
  );
}

// function resolveProgress(instance: PlotInstance, maxTime: number): number {
//   const time = instance.lines.reduce(
//     (prv, cur) => Math.max(prv, cur.x.at(-1) ?? 0),
//     Number.NEGATIVE_INFINITY
//   );
//   const percent = time >= maxTime ? 100 : Math.floor((100 * time) / maxTime);
//   return percent;
// }
