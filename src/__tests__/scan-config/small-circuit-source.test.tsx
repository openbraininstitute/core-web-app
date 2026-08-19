import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources/use-small-circuit-source';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodePopulation } from '@/features/circuit-nodes/types';

// Hoisted so the module factories below, which run before the test body, can
// read them.
const fixtures = vi.hoisted(() => ({
  geometry: {
    count: 1,
    positions: new Float64Array([0, 0, 0]),
    orientations: new Float64Array([0, 0, 0, 1]),
    morphologies: ['morph-a'],
  },
  config: {
    nodes: [{ name: 'default', type: 'biophysical', file: 'nodes.h5' }],
    edges: [],
    circuitAssetId: 'asset',
    raw: { components: { morphologies_dir: 'morphologies' } },
  },
}));

// The viewer barrel pulls in tgd, which touches `document` at module scope.
vi.mock('@/morpho-viewer', () => ({}));

vi.mock('@/ui/hooks/use-workspace', () => {
  const useWorkspace = () => ({ virtualLabId: 'lab', projectId: 'project' });
  return { useWorkspace, default: useWorkspace };
});

// Synapses read edge files over the network; this hook is about placement.
vi.mock('@/features/scan-config/components/circuit-viz/sources/use-afferent-synapses', () => ({
  useAfferentSynapses: () => [],
}));

vi.mock('@/features/circuit-nodes/hooks/use-node-geometry', () => ({
  useNodeGeometry: () => ({
    geometry: fixtures.geometry,
    config: fixtures.config,
    isLoading: false,
    error: null,
  }),
}));

/** Soma plus one dendrite, whose morphio ids and SONATA ids are not one apart. */
vi.mock('@/api/one/circuit-visualization', async () => {
  const { MorphoViewerTreeItemType } = await import('@/features/scan-config/types');
  return {
    circuitMorphologyPath: (circuitId: string, file: string, name: string) =>
      `${circuitId}/${file}/${name}`,
    fetchCircuitViz: async () => [
      {
        id: 'soma',
        sonata_section_id: 0,
        parent_id: null,
        type: MorphoViewerTreeItemType.Soma,
        points: [[0, 0, 0]],
        radii: [8],
      },
      {
        id: '0',
        sonata_section_id: 3,
        parent_id: 'soma',
        type: MorphoViewerTreeItemType.BasalDendrite,
        points: [
          [8, 0, 0],
          [58, 0, 0],
        ],
        radii: [1, 1],
      },
    ],
  };
});

const circuit = { id: 'circuit-id' } as ICircuit;

function render(showAxons: boolean) {
  return renderHook(() =>
    useSmallCircuitSource({
      circuit,
      population: fixtures.config.nodes[0] as NodePopulation,
      showAxons,
    })
  );
}

describe('useSmallCircuitSource', () => {
  /**
   * The regression this pins: morphoviewer splits a cell id on `?` and calls
   * `loadCell` with the path part, so keying the index by the argument stores it
   * under an id `useMorphologyLocationSelection` never asks for — and every
   * morphology location silently stops being drawn.
   */
  it('indexes SONATA section ids under the id the viewer knows the cell by', async () => {
    const { result } = render(true);
    const cellId = result.current.cells[0].id;

    expect(cellId).toContain('?axons=');
    // As the viewer calls it: the query part stripped.
    await act(async () => {
      await result.current.loadCell(cellId.split('?')[0]);
    });

    await waitFor(() => expect(result.current.sonataSectionIds?.get(cellId)?.get(3)).toBe('0'));
  });

  it('keys the two axon states apart', async () => {
    const withAxons = render(true);
    await act(async () => {
      await withAxons.result.current.loadCell('circuit-id #0');
    });

    const withoutAxons = render(false);
    await act(async () => {
      await withoutAxons.result.current.loadCell('circuit-id #0');
    });

    // Each viewer id carries its own index: the axon-off one is built from the
    // filtered sections, so it names a different set of sections.
    await waitFor(() => {
      expect([...(withAxons.result.current.sonataSectionIds?.keys() ?? [])]).toEqual([
        'circuit-id #0?axons=true',
      ]);
      expect([...(withoutAxons.result.current.sonataSectionIds?.keys() ?? [])]).toEqual([
        'circuit-id #0?axons=false',
      ]);
    });
  });
});
