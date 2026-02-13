import dynamic from 'next/dynamic';
import React from 'react';

import { logError } from '@/util/logger';
import { classNames } from '@/util/utils';

import ToolSkeleton from '../../tool-skeleton';

import type { Data, Layout } from 'plotly.js-dist-min';

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
  const [plotReady, setPlotReady] = React.useState(false);

  const props = React.useMemo(
    () => makeProps(plotType, value, convert, assert),
    [plotType, value, convert, assert]
  );

  if (!props) return null;

  // Extract title from layout
  const title = props.layout?.title?.text || props.layout?.title || '';
  const titleFont = props.layout?.title?.font || {};

  // Remove title from layout and fix margin
  const modifiedLayout = {
    ...props.layout,
    title: undefined,
    margin: {
      ...props.layout?.margin,
      t: (props.layout?.margin?.t || 80) - 40, // Reduce top margin since title is external
    },
  };
  return (
    // Display plot title outside of plotly for reactivity
    <div className={classNames('h-full w-full', styles.plotContainer)}>
      {title && (
        <div
          className="px-4 py-2 text-center font-bold break-words hyphens-auto"
          style={{
            fontSize: titleFont.size || 16,
            fontFamily: titleFont.family || 'Arial, sans-serif',
            fontWeight: titleFont.weight || 'bold',
            color: titleFont.color || '#333',
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
      )}
      {!plotReady && <ToolSkeleton />}
      <Plot
        className={classNames(className, styles.genericPlot)}
        style={{ width: '100%', display: plotReady ? 'block' : 'none' }}
        data={props.data}
        layout={modifiedLayout}
        frames={props?.frames}
        config={{ displaylogo: false }}
        useResizeHandler
        onInitialized={() => setPlotReady(true)}
        onUpdate={() => setPlotReady(true)}
      />
    </div>
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
