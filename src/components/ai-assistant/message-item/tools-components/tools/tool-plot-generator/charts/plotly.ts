import { Data, Layout, Frame } from 'plotly.js-dist-min';
import { assertType } from '@/util/type-guards';

export interface PlotlyJson {
  data: Data[];
  layout: Partial<Layout>;
  frames?: Partial<Frame>[];
}

export function convertPlotlyChart(obj: PlotlyJson): PlotlyJson | null {
  const axisUpdates: Record<string, any> = {};

  Object.keys(obj.layout).forEach((key) => {
    if (key.match(/^[xy]axis\d*$/)) {
      const axis = obj.layout[key as keyof Layout] as any;
      axisUpdates[key] = {
        ...axis,
        ...(axis?.showgrid !== false && { gridcolor: 'rgba(0,0,0,0.3)' }),
        zerolinecolor: 'rgba(0,0,0,0.5)',
      };
    }
  });

  const props: PlotlyJson = {
    data: obj.data,
    layout: {
      ...obj.layout,
      width: undefined,
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      template: {
        ...obj.layout.template,
        layout: {
          ...obj.layout.template?.layout,
          xaxis: { gridcolor: 'rgba(0,0,0,0.3)', zerolinecolor: 'rgba(0,0,0,0.5)' },
          yaxis: { gridcolor: 'rgba(0,0,0,0.3)', zerolinecolor: 'rgba(0,0,0,0.5)' },
        },
      },
      ...axisUpdates,
    },
    frames: obj.frames,
  };
  return props;
}

export function assertPlotlyChart(data: unknown): asserts data is PlotlyJson {
  assertType(data, {
    data: ['array', {}],
    layout: ['partial', {}],
    frames: ['?', ['array', ['partial', {}]]],
  });
}
