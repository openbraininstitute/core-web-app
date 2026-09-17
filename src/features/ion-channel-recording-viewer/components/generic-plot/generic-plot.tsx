import Plotly, { type Data, type Layout } from 'plotly.js-dist-min';
import React from 'react';

import { classNames } from '@/util/utils';

import styles from './generic-plot.module.css';

export interface GenericPlotProps<T> {
  className?: string;
  data?: T | null;
  factory: (data: T) => {
    data: Data[];
    layout: Partial<Layout>;
  };
}

export function GenericPlot<T>({ className, data, factory }: GenericPlotProps<T>) {
  const refPlot = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const plot = refPlot.current;
    if (!plot || !data) return;

    const paint = () => {
      const plotlyParams = factory(data);
      Plotly.react(plot, plotlyParams.data, plotlyParams.layout, PLOT_CONFIG);
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(plot);
    return () => observer.unobserve(plot);
  }, [data, factory]);
  return <div className={classNames(className, styles.genericPlot)} ref={refPlot} />;
}

const PLOT_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
  displaylogo: false,
  autosizable: true,
};
