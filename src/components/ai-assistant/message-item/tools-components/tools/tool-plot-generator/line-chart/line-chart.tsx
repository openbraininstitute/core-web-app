import React from 'react';
import Plot from 'react-plotly.js';
import { Data, Layout } from 'plotly.js-dist-min';

import { assertType } from '@/util/type-guards';
import { classNames } from '@/util/utils';
import { logError } from '@/util/logger';
import { useAsyncMemo } from '@/hooks/async-memo';

import styles from './line-chart.module.css';

export interface LineChartProps {
  className?: string;
  value: string;
}

export default function LineChart({ className, value }: LineChartProps) {
  const props = useAsyncMemo(value, convertToData);
  if (!props) return null;

  return (
    <Plot
      className={classNames(className, styles.lineChart)}
      style={{}}
      data={props.data}
      layout={props.layout}
    />
  );
}

async function convertToData(
  value: string
): Promise<{ data: Data[]; layout: Partial<Layout> } | null> {
  try {
    const obj = JSON.parse(value);
    assertDataType(obj);
    const props: { data: Data[]; layout: Partial<Layout> } = {
      data: [
        {
          x: obj.values.map((item) => item.x),
          y: obj.values.map((item) => item.y),
          type: 'scatter',
          mode: 'lines',
          marker: { color: obj.line_color ?? '#333' },
        },
      ],
      layout: {
        title: obj.title,
        autosize: true,
      },
    };
    return props;
  } catch (ex) {
    logError('Unable to parse LineChart content:', ex, value);
    return null;
  }
}

function assertDataType(data: unknown): asserts data is {
  title: string;
  description: string;
  x_label: string;
  y_label: string;
  line_color: string | null;
  values: Array<{ x: number; y: number }>;
} {
  assertType(data, {
    title: 'string',
    description: 'string',
    x_label: 'string',
    y_label: 'string',
    line_color: ['|', 'null', 'string'],
    values: ['array', { x: 'number', y: 'number' }],
  });
}
