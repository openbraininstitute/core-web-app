import {
  type CurrentUnit,
  convertCurrentSeries,
  convertVoltageSeries,
  type VoltageUnit,
} from '@/util/explore-section/plotHelpers';

import type { PlotData } from 'plotly.js-dist-min';
import type { RecordingSeries } from '@/features/ephys-viewer/trace-index';

const DEFAULT_VOLTAGE_UNIT: VoltageUnit = 'mV';

/** A Plotly trace tagged with the sweep it came from, so legend clicks can map back to it. */
export type SweepTrace = Partial<PlotData> & { sweepName: string };

/**
 * Convert the worker's decimated series into Plotly traces, in the viewer's display units.
 *
 * Whether a recording is a current or a voltage is a property of the file, not of the plot, so
 * both the overview thumbnails and the interactive plots decide it the same way — hence this
 * living outside either of them. `color` takes a function where sweeps are coloured
 * individually, or a single colour where the whole recording shares one.
 */
export function toPlotTraces(
  recording: RecordingSeries | undefined,
  {
    color,
    currentUnit,
  }: { color: string | ((sweep: string) => string | undefined); currentUnit: CurrentUnit }
): SweepTrace[] {
  if (!recording) return [];

  const { unit, conversionFactor } = recording.meta;

  return recording.series.map(({ sweep, x, y }) => ({
    name: sweep,
    sweepName: sweep,
    x,
    y:
      unit === 'amperes'
        ? convertCurrentSeries(y, currentUnit, conversionFactor)
        : convertVoltageSeries(y, DEFAULT_VOLTAGE_UNIT, conversionFactor),
    line: { color: typeof color === 'function' ? color(sweep) : color },
  }));
}
