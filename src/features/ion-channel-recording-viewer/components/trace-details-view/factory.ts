import { Data, Layout } from 'plotly.js-dist-min';

import { TgdColor } from '@bbp/morphoviewer';
import { IonChannelRecordingPlotLine } from '../../ion-channel-recording-parser';
import { usePlotParams } from './hooks';

export function factory(params: ReturnType<typeof usePlotParams>): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const { plot, colorMap, preview, selectedLines } = params;
  const [invisibles, visibles] = splitLinesByVisibility(plot?.lines, selectedLines, preview);
  const data: Data[] = [
    ...invisibles.map((line) => {
      const LineData: Data = {
        x: line.x,
        y: line.y,
        name: line.id,
        line: {
          color: addTransparency(colorMap.get(line.id)),
          width: 0.75,
        },
      };

      return LineData;
    }),
    ...visibles.map((line) => {
      const LineData: Data = {
        x: line.x,
        y: line.y,
        name: line.id,
        line: {
          color: colorMap.get(line.id),
          width: 0.75,
        },
      };

      return LineData;
    }),
  ];
  const layout: Partial<Layout> = {
    showlegend: false,
    margin: { b: 32, t: 4, l: 48, r: 4 },
    xaxis: { title: plot?.xAxisLabel },
    yaxis: { title: plot?.yAxisLabel },
  };

  return { data, layout };
}

function splitLinesByVisibility(
  lines: IonChannelRecordingPlotLine[] | undefined,
  selectedLines: string[],
  preview: string | undefined
): [IonChannelRecordingPlotLine[], IonChannelRecordingPlotLine[]] {
  if (!lines) return [[], []];

  const isVisible = (line: IonChannelRecordingPlotLine) => {
    const { id } = line;
    if (preview) return [...selectedLines, preview].includes(id);
    if (selectedLines.length > 0) return selectedLines.includes(id);
    return true;
  };
  const isInvisible = (line: IonChannelRecordingPlotLine) => !isVisible(line);

  return [lines.filter(isInvisible), lines.filter(isVisible)];
}

function addTransparency(cssColor: string | undefined, alpha = 0x10): string {
  if (!cssColor) {
    return `#000000${alpha.toString(16).padStart(2, '0')}`;
  }

  const color = new TgdColor();
  color.parse(cssColor);
  color.A = alpha / 0xff;
  return color.toString();
}
