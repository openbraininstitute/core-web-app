import React from 'react';
import { TgdColor } from '@tolokoban/tgd';

import { createPalette } from '../../colors';
import {
  IonChannelRecordingPlot,
  IonChannelRecordingProtocol,
  IonChannelRecordingRepetition,
} from '../../ion-channel-recording-parser';

export function usePlotParams(
  protocol: IonChannelRecordingProtocol | undefined,
  repetition: IonChannelRecordingRepetition | undefined,
  colorMap: Map<string, string>,
  selectedLines: string[],
  preview: string | undefined
) {
  return React.useMemo(
    () => ({
      paramsRepetition: {
        plot: repetition?.plot,
        colorMap,
        selectedLines,
        preview,
      },
      paramsStimuli: {
        plot: protocol?.stimuli,
        colorMap,
        selectedLines,
        preview,
      },
    }),
    [protocol, repetition, colorMap, selectedLines, preview]
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
      const palette = createPalette(plot.lines.length);
      let paletteIndex = 0;
      for (const line of plot.lines) {
        const color = new TgdColor();
        color.parse(palette[paletteIndex++]);
        colorMap.set(line.id, color.toString());
      }
    }
    return colorMap;
  }, [plot]);
}
