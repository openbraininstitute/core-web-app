import React from 'react';
import { TgdColor } from '@tolokoban/tgd';

import { IonChannelRecordingPlot } from '../../ion-channel-recording-parser';
import { createPalette } from '../../colors';

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
