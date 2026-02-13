import { assertType } from '@/util/type-guards';

import type { Data, Layout } from 'plotly.js-dist-min';

export interface ScatterChartInput {
  title: string;
  description: string;
  x_label: string;
  y_label: string;
  values: Array<{ x: number; y: number }>;
}

export function convertScatterChart(
  obj: ScatterChartInput
): { data: Data[]; layout: Partial<Layout> } | null {
  const props: { data: Data[]; layout: Partial<Layout> } = {
    data: [
      {
        x: obj.values.map((item) => item.x),
        y: obj.values.map((item) => item.y),
        type: 'scatter',
        mode: 'markers',
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

export function assertScatterChart(data: unknown): asserts data is ScatterChartInput {
  assertType(data, {
    title: 'string',
    description: 'string',
    x_label: 'string',
    y_label: 'string',
    values: ['array', { x: 'number', y: 'number' }],
  });
}
