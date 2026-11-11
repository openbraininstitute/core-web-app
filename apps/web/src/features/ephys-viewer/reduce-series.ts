import { minMaxDownsample } from '@/utils/min-max';

import type { RecordingType, SweepSeriesResponse } from '@/features/ephys-viewer/trace-index';

/**
 * Take a coarser version of a response that was already read at a finer resolution.
 *
 * Reading a repetition means pulling every sample of every one of its sweeps out of the file,
 * which is by far the most expensive thing the viewer does — around 95% of a request, and
 * unaffected by how many points come back. The overview asks for exactly the same sweeps as the
 * detail view at a tenth of the points, so reducing what is already in hand is the difference
 * between reading a repetition once per session and once per view.
 *
 * The result is what decimating the file directly would have given, not an approximation of it;
 * see `minMaxDownsample`.
 */
export function reduceSweepSeries(
  source: SweepSeriesResponse,
  desiredLength: number
): SweepSeriesResponse {
  const reduced: SweepSeriesResponse = {};

  for (const recordingType of Object.keys(source) as RecordingType[]) {
    reduced[recordingType] = source[recordingType]?.map(({ meta, series }) => ({
      meta,
      series: series.map(({ sweep, x, y }) => ({
        sweep,
        ...minMaxDownsample(x, y, desiredLength),
      })),
    }));
  }

  return reduced;
}
