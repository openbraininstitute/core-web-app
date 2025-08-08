import { Data, Layout } from 'plotly.js-dist-min';

import { assertType } from '@/util/type-guards';

export interface BarChartInput {
  title: string;
  description: string;
  x_label: string;
  y_label: string;
  orientation: string;
  values: {
    category: string;
    value: number;
    color?: string | null;
  }[];
  color?: string | null;
}

export function convertBarChart(
  obj: BarChartInput
): { data: Data[]; layout: Partial<Layout> } | null {
  const props: { data: Data[]; layout: Partial<Layout> } = {
    data: [
      {
        name: obj.title,
        x: obj.values.map((item) => item.category),
        y: obj.values.map((item) => item.value),
        type: 'bar',
        opacity: 0.8,
        xaxis: obj.x_label,
        yaxis: obj.y_label,
        marker: { color: obj.values.map((item) => item.color ?? '#07f') },
      },
    ],
    layout: {
      title: obj.title,
      autosize: true,
    },
  };
  return props;
}

export function assertBarChart(data: unknown): asserts data is BarChartInput {
  assertType(data, {
    title: 'string',
    description: 'string',
    x_label: 'string',
    y_label: 'string',
    orientation: 'string',
    values: [
      'array',
      {
        category: 'string',
        value: 'number',
        color: ['?', ['|', 'string', 'null']],
      },
    ],
    color: ['?', ['|', 'string', 'null']],
  });
}
