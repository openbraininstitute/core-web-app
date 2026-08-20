import { File as H5File, ready } from 'h5wasm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  loadAfferentSynapses,
  Report,
} from '@/features/scan-config/components/circuit-viz/synapses';
import { MorphoViewerTreeItemType } from '@/morpho-viewer/tree-item-type';

import type { NodePlacement } from '@/features/circuit-nodes/geometry-utils';
import type { MorphoViewerTree } from '@/morpho-viewer';

/** Soma radius of the one-sphere cell every test here draws. */
const SOMA_RADIUS = 10;

/** Unrotated, at the origin, so world coordinates are morphology coordinates. */
const AT_ORIGIN: NodePlacement = { center: [0, 0, 0], orientation: [0, 0, 0, 1] };

type Synapse = {
  position: [number, number, number];
  /** 0 is the soma; see `isSomaSection`. */
  sectionId: number;
  targetNodeId: number;
};

/**
 * Write a throwaway SONATA edges file into the WASM FS and hand back its name.
 *
 * A real file rather than a stubbed reader: the dataset layout — `afferent_*`
 * under `0/` but `target_node_id` beside it — is exactly the sort of thing a
 * stub would agree with while a circuit did not.
 */
function writeEdgesFile(
  name: string,
  populations: Record<string, Synapse[] | null>,
  /** Datasets to leave out, per population, for the half-written cases. */
  omit: Record<string, string[]> = {}
) {
  const file = new H5File(name, 'w');
  file.create_group('edges');

  for (const [population, synapses] of Object.entries(populations)) {
    const base = `edges/${population}`;
    file.create_group(base);
    file.create_group(`${base}/0`);
    // `null` writes a population with no surface coordinates at all, which is
    // what a circuit whose edges predate `afferent_surface_*` looks like.
    if (!synapses) continue;

    const omitted = new Set(omit[population] ?? []);
    const write = (suffix: string, data: number[]) => {
      if (!omitted.has(suffix)) file.create_dataset({ name: `${base}/${suffix}`, data });
    };
    const axis = (i: 0 | 1 | 2) => synapses.map((s) => s.position[i]);
    write('0/afferent_surface_x', axis(0));
    write('0/afferent_surface_y', axis(1));
    write('0/afferent_surface_z', axis(2));
    write(
      '0/afferent_section_id',
      synapses.map((s) => s.sectionId)
    );
    write(
      'target_node_id',
      synapses.map((s) => s.targetNodeId)
    );
  }

  file.close();
  return name;
}

/** A cell drawn as a single sphere: one parentless soma sample, nothing else. */
function somaOnlyTree(): MorphoViewerTree {
  return {
    cellId: 'cell',
    roots: [
      {
        x: 0,
        y: 0,
        z: 0,
        radius: SOMA_RADIUS,
        type: MorphoViewerTreeItemType.Soma,
        sectionId: 'soma',
        segmentId: '0',
        distanceFromSoma: 0,
      },
    ],
  };
}

/** Wire one edges file up to the loader, counting how often it is opened. */
function harness(
  filename: string,
  overrides: {
    placementOf?: (index: number) => NodePlacement | null;
    loadTree?: (index: number) => Promise<MorphoViewerTree | null>;
  } = {}
) {
  const close = vi.fn(async () => {});
  const openEdgesFile = vi.fn(async () => ({ file: new H5File(filename, 'r'), close }));
  return {
    close,
    openEdgesFile,
    run: (edges: Array<{ file: string; populations: string[] }>) =>
      loadAfferentSynapses({
        report: new Report(),
        edges,
        openEdgesFile,
        placementOf: overrides.placementOf ?? (() => AT_ORIGIN),
        loadTree: overrides.loadTree ?? (async () => somaOnlyTree()),
      }),
  };
}

/** Read one synapse back out of a flat `[x, y, z, …]` group. */
function pointAt(coordinates: Float32Array, index: number) {
  return [coordinates[index * 3], coordinates[index * 3 + 1], coordinates[index * 3 + 2]];
}

beforeAll(async () => {
  await ready;
});

describe('loadAfferentSynapses', () => {
  it('projects soma synapses onto the soma the viewer draws', async () => {
    const file = writeEdgesFile('edges-soma.h5', {
      default: [
        // SONATA places soma synapses against a sphere of its own, so they
        // arrive off the drawn one in both directions.
        { position: [20, 0, 0], sectionId: 0, targetNodeId: 0 },
        { position: [0, 4, 0], sectionId: 0, targetNodeId: 0 },
      ],
    });

    const [group] = await harness(file).run([{ file, populations: ['default'] }]);

    expect(pointAt(group.coordinates, 0)).toEqual([SOMA_RADIUS, 0, 0]);
    expect(pointAt(group.coordinates, 1)).toEqual([0, SOMA_RADIUS, 0]);
  });

  it('leaves neurite synapses where the circuit put them', async () => {
    const file = writeEdgesFile('edges-neurite.h5', {
      default: [{ position: [100, 20, 3], sectionId: 7, targetNodeId: 0 }],
    });

    const [group] = await harness(file).run([{ file, populations: ['default'] }]);

    expect(pointAt(group.coordinates, 0)).toEqual([100, 20, 3]);
  });

  it('leaves the synapses of an unplaced target cell unprojected', async () => {
    const file = writeEdgesFile('edges-unplaced.h5', {
      default: [{ position: [20, 0, 0], sectionId: 0, targetNodeId: 3 }],
    });

    // Node 3 is not in the drawn population, so there is nothing to project on.
    const [group] = await harness(file, { placementOf: () => null }).run([
      { file, populations: ['default'] },
    ]);

    expect(pointAt(group.coordinates, 0)).toEqual([20, 0, 0]);
  });

  it('skips a population with no afferent_surface datasets', async () => {
    const file = writeEdgesFile('edges-mixed.h5', {
      bare: null,
      full: [{ position: [20, 0, 0], sectionId: 0, targetNodeId: 0 }],
    });

    const groups = await harness(file).run([{ file, populations: ['bare', 'full'] }]);

    expect(groups.map((g) => g.populationName)).toEqual(['full']);
  });

  it('reads every population of a file from one open handle', async () => {
    const synapse: Synapse = { position: [20, 0, 0], sectionId: 0, targetNodeId: 0 };
    const file = writeEdgesFile('edges-two-pops.h5', { a: [synapse], b: [synapse] });

    const { openEdgesFile, close, run } = harness(file);
    const groups = await run([{ file, populations: ['a', 'b'] }]);

    expect(groups.map((g) => g.populationName)).toEqual(['a', 'b']);
    expect(openEdgesFile).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('skips a population missing one of the three surface axes', async () => {
    const synapse: Synapse = { position: [20, 0, 0], sectionId: 0, targetNodeId: 0 };
    const file = writeEdgesFile(
      'edges-partial.h5',
      { partial: [synapse], full: [synapse] },
      { partial: ['0/afferent_surface_y'] }
    );

    // Guarding on `afferent_surface_x` alone would let this reach the read and
    // throw, costing `full` its synapses as well as `partial`.
    const groups = await harness(file).run([{ file, populations: ['partial', 'full'] }]);

    expect(groups.map((g) => g.populationName)).toEqual(['full']);
  });

  it('contains a failing population without dropping the rest, and still closes', async () => {
    const synapse: Synapse = { position: [20, 0, 0], sectionId: 0, targetNodeId: 0 };
    const file = writeEdgesFile('edges-failing.h5', { first: [synapse], second: [synapse] });

    let calls = 0;
    const { close, run } = harness(file, {
      loadTree: async () => {
        calls += 1;
        if (calls === 1) throw new Error('morphology service is down');
        return somaOnlyTree();
      },
    });

    const groups = await run([{ file, populations: ['first', 'second'] }]);

    // One bad population is one population's worth of missing synapses, not the
    // whole circuit's.
    expect(groups.map((g) => g.populationName)).toEqual(['second']);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
