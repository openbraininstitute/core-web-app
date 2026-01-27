import type { Data, Layout } from 'plotly.js-dist-min';

import { assertType } from '@/util/type-guards';

export interface PieChartInput {
  title: string;
  description: string;
  show_percentages: boolean;
  values: Array<{ category: string; value: number; color: string }>;
}

export function convertPieChart(
  obj: PieChartInput
): { data: Data[]; layout: Partial<Layout> } | null {
  const props: { data: Data[]; layout: Partial<Layout> } = {
    data: [
      {
        values: obj.values.map((item) => item.value),
        labels: obj.values.map((item) => item.category),
        type: 'pie',
        name: obj.title,
        hoverinfo: 'label+percent+name',
        marker: {
          colors: obj.values.map((item) => item.color),
        },
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

export function assertPieChart(data: unknown): asserts data is PieChartInput {
  assertType(data, {
    title: 'string',
    description: 'string',
    show_percentages: 'boolean',
    values: ['array', { category: 'string', value: 'number', color: 'string' }],
  });
}
