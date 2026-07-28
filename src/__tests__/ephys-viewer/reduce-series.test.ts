import { describe, expect, it } from 'vitest';

import { reduceSweepSeries } from '@/features/ephys-viewer/reduce-series';
import { RecordingType } from '@/features/ephys-viewer/trace-index';
import { minMaxUniform } from '@/utils/min-max';

import type { RecordingMeta, SweepSeriesResponse } from '@/features/ephys-viewer/trace-index';

const VOLTS: RecordingMeta = {
  unit: 'volts',
  conversionFactor: 1,
  timeUnit: 'Seconds',
  timeRate: 20_000,
};

const AMPERES: RecordingMeta = { ...VOLTS, unit: 'amperes', label: 'Current' };

function sweepSignal(offset: number): Float64Array {
  const out = new Float64Array(20_000);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.sin((i + offset) / 30) * 10;
  return out;
}

/** A response shaped like the worker's, at the resolution every read is taken at. */
function detailResponse(): SweepSeriesResponse {
  const sweeps = ['0', '1', '2'];

  return {
    [RecordingType.STIMULUS]: [
      {
        meta: AMPERES,
        series: sweeps.map((sweep, index) => ({
          sweep,
          ...minMaxUniform(sweepSignal(index * 100), 0.05, 1000),
        })),
      },
    ],
    [RecordingType.RESPONSE]: [
      {
        meta: VOLTS,
        series: sweeps.map((sweep, index) => ({
          sweep,
          ...minMaxUniform(sweepSignal(index * 250), 0.05, 1000),
        })),
      },
    ],
  };
}

describe('reduceSweepSeries', () => {
  it('reduces every series and leaves the structure around them alone', () => {
    const reduced = reduceSweepSeries(detailResponse(), 100);

    expect(Object.keys(reduced)).toEqual([RecordingType.STIMULUS, RecordingType.RESPONSE]);

    const stimulus = reduced[RecordingType.STIMULUS];
    expect(stimulus).toHaveLength(1);
    expect(stimulus?.[0].meta).toEqual(AMPERES);
    expect(stimulus?.[0].series.map(({ sweep }) => sweep)).toEqual(['0', '1', '2']);

    for (const recordings of Object.values(reduced)) {
      for (const { series } of recordings) {
        for (const { x, y } of series) {
          expect(x).toHaveLength(100);
          expect(y).toHaveLength(100);
        }
      }
    }
  });

  it('gives what reading the file at the coarser length would have', () => {
    const reduced = reduceSweepSeries(detailResponse(), 100);

    expect(reduced[RecordingType.RESPONSE]?.[0].series[1]).toEqual({
      sweep: '1',
      ...minMaxUniform(sweepSignal(250), 0.05, 100),
    });
  });

  it('leaves the source untouched', () => {
    const source = detailResponse();
    reduceSweepSeries(source, 100);

    expect(source[RecordingType.STIMULUS]?.[0].series[0].y).toHaveLength(1000);
  });
});
