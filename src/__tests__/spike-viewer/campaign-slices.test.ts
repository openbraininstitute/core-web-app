import { describe, expect, it } from 'vitest';

import { scanValueId } from '@/features/scan-config/components/scan-coordinates';
import {
  axisOrder,
  combinations,
  isSeedParameter,
  meanCourse,
  meanSummary,
  parameterLabel,
  simulationsMatching,
} from '@/features/spike-viewer/campaign-statistics/campaign-slices';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';

const simulation = (id: string, scan: Record<string, unknown>) =>
  ({ id, scan_parameters: scan }) as unknown as ISimulation;

describe('isSeedParameter', () => {
  it('knows a seed by its name, at any depth', () => {
    expect(isSeedParameter('initialize.random_seed')).toBe(true);
    expect(isSeedParameter('stimuli.VPMReplay.random_seed')).toBe(true);
    expect(isSeedParameter('seed')).toBe(true);
    expect(isSeedParameter('stimuli.pulse.amplitude')).toBe(false);
    expect(isSeedParameter('neuron_sets.seeded.sample_percentage')).toBe(false);
  });
});

describe('axisOrder', () => {
  it('puts seeds after the parameters worth an axis, keeping their order', () => {
    const keys = axisOrder([
      { key: 'initialize.random_seed' },
      { key: 'stimuli.VPMReplay.frequency' },
      { key: 'stimuli.Background.mean_percentage_of_threshold_current' },
    ]).map((p) => p.key);
    expect(keys).toEqual([
      'stimuli.VPMReplay.frequency',
      'stimuli.Background.mean_percentage_of_threshold_current',
      'initialize.random_seed',
    ]);
  });
});

describe('parameterLabel', () => {
  it('says the last part, and the block too where two parameters share it', () => {
    const keys = ['stimuli.A.frequency', 'stimuli.B.frequency', 'initialize.random_seed'];
    expect(parameterLabel('initialize.random_seed', keys)).toBe('random_seed');
    expect(parameterLabel('stimuli.A.frequency', keys)).toBe('A frequency');
  });
});

describe('simulationsMatching', () => {
  it('keeps the simulations at the values named, whatever their others', () => {
    const simulations = [
      simulation('a', { seed: 1, rate: 50 }),
      simulation('b', { seed: 2, rate: 50 }),
      simulation('c', { seed: 1, rate: 100 }),
    ];
    const ids = simulationsMatching(simulations, { rate: scanValueId(50) }).map((s) => s.id);
    expect(ids).toEqual(['a', 'b']);
  });
});

describe('meanSummary', () => {
  it('averages each measure, leaving out a simulation without it', () => {
    const mean = meanSummary([
      { meanRate: 4, meanCv: Number.NaN },
      { meanRate: 8, meanCv: 0.5 },
    ]);
    expect(mean.meanRate).toBe(6);
    expect(mean.meanCv).toBe(0.5);
    expect(meanSummary([{ meanCv: Number.NaN }]).meanCv).toBeNaN();
  });
});

describe('meanCourse', () => {
  it('averages courses over the same times, and leaves out one over others', () => {
    const x = [0, 10, 20];
    const mean = meanCourse([
      { x, y: [1, 2, 3] },
      { x, y: [3, 4, 5] },
      { x: [0, 5, 10, 15], y: [100, 100, 100, 100] },
    ]);
    expect(Array.from(mean?.y ?? [])).toEqual([2, 3, 4]);
    expect(meanCourse([])).toBeUndefined();
  });
});

describe('combinations', () => {
  it('gives every combination of the values, one plot each', () => {
    const combos = combinations([
      { key: 'seed', values: [{ id: '1' }, { id: '2' }] },
      { key: 'rate', values: [{ id: '50' }, { id: '100' }, { id: '200' }] },
    ]);
    expect(combos).toHaveLength(6);
    expect(combos[0]).toEqual({ seed: '1', rate: '50' });
    expect(combinations([])).toEqual([{}]);
  });
});
