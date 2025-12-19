import type { Data, Layout } from 'plotly.js-dist-min';

import { assertType } from '@/util/type-guards';

export interface LineChartInput {
  title: string;
  description: string;
  x_label: string;
  y_label: string;
  line_color: string | null;
  values: Array<{ x: number; y: number }>;
}

export function convertLineChart(
  obj: LineChartInput,
): { data: Data[]; layout: Partial<Layout> } | null {
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
      title: {
        text: obj.title,
      },
      autosize: true,
    },
  };
  return props;
}

export function assertLineChart(data: unknown): asserts data is LineChartInput {
  assertType(data, {
    title: 'string',
    description: 'string',
    x_label: 'string',
    y_label: 'string',
    line_color: ['|', 'null', 'string'],
    values: ['array', { x: 'number', y: 'number' }],
  });
}
