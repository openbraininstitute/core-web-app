import React from 'react';
import { TgdColor } from '@tolokoban/tgd';

import { IonChannelRecordingPlot } from '../../ion-channel-recording-parser';

export function usePlotParams(
  plot: IonChannelRecordingPlot | undefined,
  colorMap: Map<string, string>,
  selectedLines: string[],
  preview: string | undefined
) {
  return React.useMemo(
    () => ({
      plot,
      colorMap,
      selectedLines,
      preview,
    }),
    [plot, colorMap, selectedLines, preview]
  );
}

export function useVisibleLines(plot?: IonChannelRecordingPlot) {
  const [selection, setSelection] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setSelection([]), [plot]);

  return {
    reset() {
      setSelection([]);
    },
    preview,
    setPreview,
    isVisible(name: string) {
      return selection.length === 0 || name === preview || selection.includes(name);
    },
    show(name: string) {
      if (!selection.includes(name)) setSelection([...selection, name]);
    },
    hide(name: string) {
      if (selection.includes(name))
        setSelection(selection.filter((selectedName) => selectedName !== name));
    },
    selection,
    setSelection,
  };
}

export function useColorMap(plot?: IonChannelRecordingPlot): Map<string, string> {
  return React.useMemo(() => {
    const colorMap = new Map<string, string>();
    if (plot && plot.lines.length > 0) {
      const modulo = findNextPrime(plot.lines.length);
      const step = computeStep(modulo);
      let hue = 0.667; // Blue
      for (const line of plot.lines) {
        const color = new TgdColor();
        color.H = hue;
        color.S = 0.7;
        color.L = 0.6;
        color.hsl2rgb();
        colorMap.set(line.id, color.toString());
        hue += step;
      }
    }
    return colorMap;
  }, [plot]);
}

function findNextPrime(value: number) {
  let prime = value;
  while (!isPrime(prime)) prime++;
  return prime;
}

function isPrime(value: number) {
  if (value < 3) return false;

  const max = Math.ceil(Math.sqrt(value));
  for (let divisor = 3; divisor <= max; divisor++) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function computeStep(value: number) {
  const step = Math.ceil(value / 3);
  return (step < value ? step : 1) / value;
}
