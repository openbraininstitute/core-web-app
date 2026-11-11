import { describe, expect, it } from 'vitest';

import { parseSonataConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import {
  pickDefaultPopulation,
  resolvePopulation,
} from '@/features/circuit-nodes/population-utils';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';
import type { NodePopulation } from '@/features/circuit-nodes/types';

function population(name: string, type: string): NodePopulation {
  return { name, type, file: 'nodes.h5' };
}

describe('parseSonataConfig', () => {
  // Every path here leaves as an `asset_path` query parameter, so an unexpanded
  // `$VAR` or a surviving `..` is a 404 a long way from the config that caused it.
  it('expands manifest variables and normalises every path it hands on', () => {
    const raw = {
      version: 2,
      manifest: { $BASE_DIR: '.', $NETWORK_DIR: '$BASE_DIR/networks' },
      node_sets_file: '$BASE_DIR/node_sets.json',
      networks: {
        nodes: [
          {
            nodes_file: '$NETWORK_DIR/nodes/../nodes/nodes.h5',
            populations: { All: { type: 'biophysical' } },
          },
        ],
        edges: [
          {
            edges_file: '$NETWORK_DIR/edges/edges.h5',
            populations: { All__All__chemical: { type: 'chemical' } },
          },
        ],
      },
    } as unknown as ICircuitSonataConfiguration;

    const parsed = parseSonataConfig(raw, 'asset-id');

    expect(parsed.nodes).toEqual([
      { name: 'All', type: 'biophysical', file: 'networks/nodes/nodes.h5' },
    ]);
    expect(parsed.edges).toEqual([
      { name: 'All__All__chemical', type: 'chemical', file: 'networks/edges/edges.h5' },
    ]);
  });

  it('keeps the raw config, which the morphology resolver still reads', () => {
    const raw = { networks: { nodes: [], edges: [] } } as unknown as ICircuitSonataConfiguration;

    expect(parseSonataConfig(raw, 'asset-id')).toMatchObject({ circuitAssetId: 'asset-id', raw });
  });
});

describe('pickDefaultPopulation', () => {
  it('prefers a biophysical population over one listed before it', () => {
    const populations = [population('virtual', 'virtual'), population('All', 'biophysical')];

    expect(pickDefaultPopulation(populations)?.name).toBe('All');
  });

  // SONATA's default, and the reason this is not a plain equality check: an
  // untyped population is biophysical, and skipping it opens one with nothing to draw.
  it('treats a population with no declared type as biophysical', () => {
    const populations = [population('virtual', 'virtual'), population('All', '')];

    expect(pickDefaultPopulation(populations)?.name).toBe('All');
  });

  it('falls back to the first entry when none is biophysical', () => {
    const populations = [population('virtual', 'virtual'), population('points', 'point_neuron')];

    expect(pickDefaultPopulation(populations)?.name).toBe('virtual');
  });

  it('has nothing to pick from an empty config', () => {
    expect(pickDefaultPopulation([])).toBeUndefined();
  });
});

describe('resolvePopulation', () => {
  const populations = [population('virtual', 'virtual'), population('All', 'biophysical')];

  it('honours the selected name', () => {
    expect(resolvePopulation(populations, 'virtual')?.name).toBe('virtual');
  });

  it('falls back to the default when the name is gone', () => {
    expect(resolvePopulation(populations, 'removed')?.name).toBe('All');
  });
});
