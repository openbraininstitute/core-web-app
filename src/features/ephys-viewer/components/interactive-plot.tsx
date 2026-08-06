import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import Plotly, { type PlotData } from 'plotly.js-dist-min';
import { useEffect, useMemo, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { useInteractivePlotConfig } from '@/features/ephys-viewer/hooks/config-hooks';
import { usePlotRevision } from '@/features/ephys-viewer/hooks/use-plot-revision';
import { useSweepSeries } from '@/features/ephys-viewer/hooks/use-sweep-series';
import { type SweepTrace, toPlotTraces, yAxisTitle } from '@/features/ephys-viewer/plot-traces';
import { RecordingType } from '@/features/ephys-viewer/trace-index';
import { type CurrentUnit, ensureCurrentUnit } from '@/util/explore-section/plotHelpers';

import type { RecordingSeries } from '@/features/ephys-viewer/trace-index';
import type { PlotProps, ZoomRanges } from '@/features/ephys-viewer/types';

const Plot = createPlotlyComponent(Plotly);

export const DEFAULT_CURRENT_UNIT: CurrentUnit = 'pA';

export const currentUnitAtom = atomWithStorage<CurrentUnit>(
  'ephysViewer.currentUnit',
  DEFAULT_CURRENT_UNIT
);

export default function InteractivePlot({
  recording,
  recordingType,
  recordingIndex,
  seriesRequest,
  reset,
  selectedSweeps,
  setSelectedSweeps,
  previewSweep,
  colorMap,
  plotRevision,
}: PlotProps) {
  const [currentUnit] = useAtom(currentUnitAtom);
  const [zoomRanges, setZoomRanges] = useState<ZoomRanges | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reset` is a signal, not a value the body reads — a change to it is the whole trigger.
  useEffect(() => {
    setZoomRanges(null);
  }, [reset]);

  const { config, layout, font, style } = useInteractivePlotConfig();

  const isZoomed = zoomRanges
    ? zoomRanges.x[0] !== undefined || zoomRanges.x[1] !== undefined
    : false;

  // The full sweep was decimated to a fixed number of points, so zooming into it would just
  // magnify those points. Re-decimating the window in the worker gets the real detail back.
  const { data: zoomedData } = useSweepSeries(
    isZoomed && zoomRanges
      ? { ...seriesRequest, xStart: zoomRanges.x[0], xEnd: zoomRanges.x[1] }
      : null
  );

  // Keep showing the full-range series until the zoomed one lands, so the plot never blanks.
  const active = zoomedData?.[recordingType]?.[recordingIndex] ?? recording;

  const rawData = usePlotTraces(active, colorMap, currentUnit);

  // Previewing dims everything but the hovered and selected sweeps; otherwise a selection
  // narrows to it, and an empty selection means all of them.
  const plotData: Partial<PlotData>[] = useMemo(() => {
    if (previewSweep) {
      return rawData.map((data) => ({
        ...data,
        opacity:
          data.sweepName === previewSweep || selectedSweeps.includes(data.sweepName) ? 1 : 0.05,
      }));
    }

    if (!selectedSweeps.length) return rawData;

    return rawData.filter((data) => selectedSweeps.includes(data.sweepName));
  }, [rawData, selectedSweeps, previewSweep]);

  // A unit switch and a zoom read landing both change the points without changing the layout,
  // and the container asks for a redraw of its own through `plotRevision`.
  const dataRevision = usePlotRevision(plotData, plotRevision);

  const handleClick = ({ data, curveNumber }: Readonly<Plotly.LegendClickEvent>): boolean => {
    const { sweepName: value } = data[curveNumber] as unknown as SweepTrace;
    const isSelected = selectedSweeps.includes(value);
    if (isSelected) {
      setSelectedSweeps(selectedSweeps.filter((sweep) => sweep !== value));
    } else {
      setSelectedSweeps([...selectedSweeps, value]);
    }

    return false;
  };

  const yTitle =
    yAxisTitle(active, {
      currentUnit: ensureCurrentUnit(currentUnit, DEFAULT_CURRENT_UNIT),
      voltageTitle: 'Membrane potential',
    }) ?? '';

  return (
    <Plot
      divId={`interactive-plot-${recordingType}-${recordingIndex}`}
      data={plotData}
      onLegendClick={handleClick}
      onDoubleClick={() => false}
      onRelayout={(e) => {
        const {
          'xaxis.range[0]': x1,
          'xaxis.range[1]': x2,
          'yaxis.range[0]': y1,
          'yaxis.range[1]': y2,
        } = e;
        setZoomRanges({ x: [x1, x2], y: [y1, y2] });
      }}
      layout={{
        // plotly types a title as an object; a bare string is rejected
        title: { text: recordingType === RecordingType.STIMULUS ? 'Stimulus' : 'Response' },
        datarevision: dataRevision,
        xaxis: {
          title: {
            font,
            text: `Time (ms)`,
          },
          range: zoomRanges?.x,
        },
        yaxis: {
          title: {
            font,
            text: yTitle,
          },
          range: zoomRanges?.y,
          zeroline: false,
        },
        ...layout,
      }}
      style={style}
      config={config}
    />
  );
}

/** Convert the worker's decimated series into Plotly traces, in the user's chosen units. */
function usePlotTraces(
  recording: RecordingSeries | undefined,
  colorMap: Map<string, string>,
  currentUnit: string
): SweepTrace[] {
  return useMemo(
    () =>
      toPlotTraces(recording, {
        color: (sweep) => colorMap.get(sweep),
        currentUnit: ensureCurrentUnit(currentUnit, DEFAULT_CURRENT_UNIT),
      }),
    [recording, colorMap, currentUnit]
  );
}
