import React from 'react';
import dynamic from 'next/dynamic';
import { Data, Layout } from 'plotly.js-dist-min';

import { classNames } from '@/util/utils';
import { logError } from '@/util/logger';

import styles from './generic-plot.module.css';

// Dynamically import Plot component to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
});

export interface GenericPlotProps<T> {
  className?: string;
  plotType: string;
  value: string;
  convert(value: T): { data: Data[]; layout: Partial<Layout> } | null;
  assert(data: unknown): asserts data is T;
}

export default function GenericPlot<T>({
  className,
  plotType,
  value,
  convert,
  assert,
}: GenericPlotProps<T>) {
  const props = React.useMemo(
    () => makeProps(plotType, value, convert, assert),
    [plotType, value, convert, assert]
  );

  if (!props) return null;

  return (
    <Plot
      className={classNames(className, styles.genericPlot)}
      style={{}}
      data={props.data}
      layout={props.layout}
      useResizeHandler
    />
  );
}

function makeProps<T>(
  plotType: string,
  value: string,
  convert: (value: T) => { data: Data[]; layout: Partial<Layout> } | null,
  assert: (data: unknown) => asserts data is T
): any {
  try {
    const obj = JSON.parse(value);
    try {
      assert(obj);
      const finalData = convert(obj);
      return finalData;
    } catch (ex) {
      logError(`Unexpected format for "${plotType}" chart:`, obj);
      logError(ex);
      return null;
    }
  } catch (ex) {
    logError('Unable to parse JSON:', value);
    logError(ex);
    return null;
  }
}
