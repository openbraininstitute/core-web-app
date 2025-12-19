import type { Data, Layout } from 'plotly.js-dist-min';

import { assertType } from '@/util/type-guards';

export interface HistogramChartInput {
  title: string;
  description: string;
  x_label: string;
  y_label: string;
  bins: number;
  values: number[];
  color?: string | null;
}

export function convertHistogramChart(
  obj: HistogramChartInput,
): { data: Data[]; layout: Partial<Layout> } | null {
  const props: { data: Data[]; layout: Partial<Layout> } = {
    data: [
      {
        name: obj.title,
        x: obj.values,
        autobinx: true,
        type: 'histogram',
        opacity: 0.8,
        xaxis: obj.x_label,
        yaxis: obj.y_label,
        marker: { color: obj.color ?? '#09f' },
      },
    ],
    layout: {
      title: {
        text: obj.title,
      },
      autosize: true,
    },
  };
  return props;
}

export function assertHistogramChart(data: unknown): asserts data is HistogramChartInput {
  assertType(data, {
    title: 'string',
    description: 'string',
    x_label: 'string',
    y_label: 'string',
    bins: 'number',
    values: ['array', 'number'],
    color: ['?', ['|', 'string', 'null']],
  });
}
