import { describe, expect, it } from 'vitest';

import {
  colorForElectrodeBlock,
  colorForElectrodeOrigin,
  electrodeSummaryToOverlays,
  hasElectrodeLocationsDictionary,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';

describe('electrodeSummaryToOverlays', () => {
  it('maps locations to Float32Array overlay groups with stable colours', () => {
    const groups = electrodeSummaryToOverlays({
      probe_b: { locations: [[4, 5, 6]] },
      probe_a: {
        locations: [
          [1, 2, 3],
          [7, 8, 9],
        ],
      },
    });

    expect(groups.map((g) => g.name)).toEqual(['probe_a', 'probe_b']);
    expect(groups[0].color).toBe(colorForElectrodeBlock('probe_a'));
    expect(groups[1].color).toBe(colorForElectrodeBlock('probe_b'));
    expect(Array.from(groups[0].coordinates)).toEqual([1, 2, 3, 7, 8, 9]);
    expect(Array.from(groups[1].coordinates)).toEqual([4, 5, 6]);
  });

  it('adds a distinct-colour origin sphere when origin_* is present', () => {
    const groups = electrodeSummaryToOverlays({
      utah: {
        locations: [
          [10, 20, 30],
          [11, 21, 31],
        ],
        origin_x: 9,
        origin_y: 90,
        origin_z: 10,
      },
    });

    expect(groups).toHaveLength(2);
    const electrodes = groups.find((g) => g.kind === 'electrodes');
    const origin = groups.find((g) => g.kind === 'origin');
    expect(electrodes?.name).toBe('utah');
    expect(origin?.name).toBe('utah (origin)');
    expect(electrodes?.color).toBe(colorForElectrodeBlock('utah'));
    expect(origin?.color).toBe(colorForElectrodeOrigin('utah'));
    expect(origin?.color).not.toBe(electrodes?.color);
    expect(origin?.coordinates).toBeDefined();
    expect(Array.from(origin?.coordinates ?? [])).toEqual([9, 90, 10]);
  });

  it('skips origin when origin_* is incomplete', () => {
    const groups = electrodeSummaryToOverlays({
      linear: {
        locations: [[1, 2, 3]],
        origin_x: 50,
        origin_y: 40,
        // origin_z missing
      },
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('electrodes');
  });

  it('skips empty or missing locations', () => {
    expect(
      electrodeSummaryToOverlays({
        empty: { locations: [] },
        missing: {} as { locations: [number, number, number][] },
      })
    ).toEqual([]);
  });

  it('returns [] for nullish summary', () => {
    expect(electrodeSummaryToOverlays(null)).toEqual([]);
    expect(electrodeSummaryToOverlays(undefined)).toEqual([]);
  });
});

describe('colorForElectrodeBlock', () => {
  it('is stable for the same block name', () => {
    expect(colorForElectrodeBlock('linear_1')).toBe(colorForElectrodeBlock('linear_1'));
  });
});

describe('hasElectrodeLocationsDictionary', () => {
  it('accepts non-empty objects only', () => {
    expect(hasElectrodeLocationsDictionary({ a: {} })).toBe(true);
    expect(hasElectrodeLocationsDictionary({})).toBe(false);
    expect(hasElectrodeLocationsDictionary(null)).toBe(false);
    expect(hasElectrodeLocationsDictionary([])).toBe(false);
  });
});
