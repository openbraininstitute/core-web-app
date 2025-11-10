import { Data, Layout, Frame } from 'plotly.js-dist-min';
import { assertType } from '@/util/type-guards';

export interface PlotlyJson {
  data: Data[];
  layout: Partial<Layout>;
  frames?: Partial<Frame>[];
}

export function convertPlotlyChart(obj: PlotlyJson): PlotlyJson | null {
  const props: PlotlyJson = {
    data: obj.data,
    layout: {
      ...obj.layout,
      autosize: true,
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
