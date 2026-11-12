import { describe, expect, it } from 'vitest';

import {
  compartmentColumn,
  compartmentStatistics,
  SECTION_TYPE_COLUMN,
  sectionTypeColumn,
} from '@/features/sonata-viewer/compartment-statistics';
import { reportStatistics } from '@/features/sonata-viewer/report-statistics';
import { resolveTraces } from '@/features/sonata-viewer/worker/column-mapping';

import type { PopulationMetadata } from '@/features/sonata-viewer/types';

// Two cells, nodes 3 and 5, of two compartments each.
const traces = resolveTraces([3, 5], [0, 2, 4], [10, 11, 20, 21], 4);
const population = { name: 'pop', traces } as PopulationMetadata;
const places = {
  distances: new Map([
    [0, 12.5],
    [1, 40],
    [3, 220],
  ]),
  types: new Map([
    [0, 'Basal dendrite'],
    [1, 'Basal dendrite'],
    [2, 'Apical dendrite'],
    [3, 'Apical dendrite'],
  ]),
};

describe('the statistics over compartments', () => {
  it('add where each compartment is to its statistics, by trace', () => {
    const mean = Float64Array.from([-70, -65, -60, -55]);
    const { statistics, values } = compartmentStatistics({
      statistics: reportStatistics('mV', null),
      traceValues: { mean },
      traces: 4,
      places,
      offsets: new Map([[2, 0.5]]),
    });
    expect(statistics.map((s) => s.key)).toEqual([
      'mean',
      'sd',
      'min',
      'max',
      'spikes',
      'path_distance',
      'offset',
    ]);
    expect(statistics.at(-2)?.heading).toBe('Compartment');
    expect(Array.from(values.path_distance)).toEqual([12.5, 40, Number.NaN, 220]);
    expect(Array.from(values.offset)).toEqual([Number.NaN, Number.NaN, 0.5, Number.NaN]);
    expect(values.mean).toBe(mean);
  });

  it('group and place each compartment by its own section type and by its cell’s properties', async () => {
    expect(sectionTypeColumn(places)).toEqual([
      expect.objectContaining({
        name: SECTION_TYPE_COLUMN,
        library: ['Apical dendrite', 'Basal dendrite'],
        heading: 'Compartment',
      }),
    ]);
    const nodeColumn = async (name: string) =>
      name === 'mtype'
        ? {
            kind: 'categorical' as const,
            library: ['A', 'B'],
            indices: Uint32Array.from([0, 0, 0, 1, 0, 0]),
          }
        : { kind: 'numeric' as const, values: Float64Array.from([0, 1, 2, 3, 4, 5]) };
    const sectionType = await compartmentColumn(
      SECTION_TYPE_COLUMN,
      population,
      places,
      nodeColumn
    );
    expect(sectionType).toEqual({
      kind: 'categorical',
      library: ['Apical dendrite', 'Basal dendrite', 'Unknown'],
      indices: Uint32Array.from([1, 1, 0, 0]),
    });
    const mtype = await compartmentColumn('mtype', population, places, nodeColumn);
    expect(mtype).toEqual({
      kind: 'categorical',
      library: ['A', 'B'],
      indices: Uint32Array.from([1, 1, 0, 0]),
    });
    const x = await compartmentColumn('x', population, places, nodeColumn);
    expect(x).toEqual({ kind: 'numeric', values: Float64Array.from([3, 3, 5, 5]) });
  });
});
