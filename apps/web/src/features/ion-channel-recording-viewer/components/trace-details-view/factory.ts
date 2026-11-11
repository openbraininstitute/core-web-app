import { TgdColor } from '@/morpho-viewer';

import type { Data, Layout } from 'plotly.js-dist-min';
import type { IonChannelRecordingPlotLine } from '../../ion-channel-recording-parser';
import type { usePlotParams } from './hooks';

export function factory(params: ReturnType<typeof usePlotParams>['paramsRepetition']): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const { plot, colorMap, preview, selectedLines, lineWidth = 1 } = params;
  const [invisibles, visibles] = splitLinesByVisibility(
    plot?.lines,
    selectedLines,
    preview,
    colorMap.size
  );
  const data: Data[] = [
    ...invisibles.map((line) => {
      const LineData: Data = {
        x: line.x,
        y: line.y,
        name: line.id,
        line: {
          color: addTransparency(line.color ?? colorMap.get(line.id)),
          width: lineWidth,
        },
        marker: {
          size: 0,
          opacity: 0,
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
          color: line.color ?? colorMap.get(line.id),
          width: lineWidth,
        },
        marker: {
          size: 0,
          opacity: 0,
        },
      };

      return LineData;
    }),
  ];
  const layout: Partial<Layout> = {
    showlegend: false,
    margin: { b: 32, t: 4, l: 64, r: 4 },
    xaxis: { title: plot?.xAxisLabel },
    yaxis: { title: plot?.yAxisLabel },
  };

  return { data, layout };
}

function splitLinesByVisibility(
  lines: IonChannelRecordingPlotLine[] | undefined,
  selectedLines: string[],
  preview: string | undefined,
  colorsCount: number
): [IonChannelRecordingPlotLine[], IonChannelRecordingPlotLine[]] {
  if (!lines) return [[], []];

  const specialCase = colorsCount !== lines?.length;
  const isVisible = specialCase
    ? () => true
    : (line: IonChannelRecordingPlotLine) => {
        const { id } = line;
        if (preview) return [...selectedLines, preview].includes(id);
        if (selectedLines.length > 0) return selectedLines.includes(id);
        return true;
      };
  const isInvisible = specialCase
    ? () => false
    : (line: IonChannelRecordingPlotLine) => !isVisible(line);

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
