import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources/use-small-circuit-source';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';

const DEFAULT: NodePopulation = { name: 'default', type: 'biophysical', file: 'nodes.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

/** Positions alone, as the placement hook reads them. */
function placement(positions: number[]): NodeGeometry {
  return {
    count: positions.length / 3,
    positions: new Float32Array(positions),
    orientations: null,
    morphologies: null,
  };
}

// Hoisted so the module factories below, which run before the test body, can
// read them.
const fixtures = vi.hoisted(() => ({
  /** What `useNodeGeometry` answers for the population on show. */
  detail: null as NodeGeometry | null,
  error: null as Error | null,
  config: {
    nodes: [
      { name: 'default', type: 'biophysical', file: 'nodes.h5' },
      { name: 'inputs', type: 'virtual', file: 'inputs.h5' },
    ],
    edges: [],
    circuitAssetId: 'asset',
    raw: { components: { morphologies_dir: 'morphologies' } },
  },
  placement: { placed: [], failures: new Map(), settled: true } as ReturnType<
    typeof usePopulationsPlacement
  >,
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
    geometry: fixtures.detail,
    config: fixtures.config,
    error: fixtures.error,
  }),
}));

vi.mock('@/features/circuit-nodes/hooks/use-populations-placement', () => ({
  usePopulationsPlacement: () => fixtures.placement,
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

type TProps = {
  population: NodePopulation;
  populations?: NodePopulation[];
  hiddenPopulations?: string[];
  showAxons: boolean;
};

function render(
  showAxons: boolean,
  populations?: NodePopulation[],
  population = DEFAULT,
  hiddenPopulations?: string[]
) {
  // Annotated, so the optional props stay optional for `rerender`, which
  // otherwise infers its argument from this literal and demands all four.
  const initialProps: TProps = { population, populations, hiddenPopulations, showAxons };
  return renderHook(
    (props: TProps) =>
      useSmallCircuitSource({
        circuit,
        ...props,
        populations: props.populations ?? [props.population],
        recededColor: '#cccccc',
      }),
    { initialProps }
  );
}

describe('useSmallCircuitSource', () => {
  beforeEach(() => {
    fixtures.detail = {
      count: 1,
      positions: new Float32Array([0, 0, 0]),
      orientations: new Float32Array([0, 0, 0, 1]),
      morphologies: ['morph-a'],
    };
    fixtures.error = null;
    fixtures.placement = {
      placed: [{ population: DEFAULT, geometry: placement([0, 0, 0]) }],
      failures: new Map(),
      settled: true,
    };
  });

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
      await withAxons.result.current.loadCell('circuit-id/default #0');
    });

    const withoutAxons = render(false);
    await act(async () => {
      await withoutAxons.result.current.loadCell('circuit-id/default #0');
    });

    // Each viewer id carries its own index: the axon-off one is built from the
    // filtered sections, so it names a different set of sections.
    await waitFor(() => {
      expect([...(withAxons.result.current.sonataSectionIds?.keys() ?? [])]).toEqual([
        'circuit-id/default #0?axons=true',
      ]);
      expect([...(withoutAxons.result.current.sonataSectionIds?.keys() ?? [])]).toEqual([
        'circuit-id/default #0?axons=false',
      ]);
    });
  });

  it('stands the other populations as receded somas that load nothing', async () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0]) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
    };
    const { result } = render(false, [DEFAULT, INPUTS]);

    // Declared order, with ids that tell the populations apart.
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false',
      'circuit-id/inputs #0?axons=false&soma-only',
    ]);
    expect(result.current.cells[1]).toMatchObject({ center: [10, 0, 0], color: '#cccccc' });
    // The anchor stays on the population on show; the other one sits 10 away.
    expect(result.current.anchor).toEqual([0, 0, 0]);
    await expect(result.current.loadCell('circuit-id/inputs #0')).resolves.toBeNull();
  });

  // Built once rather than once per arrival, because the viewer re-fits every
  // cell when the id set changes.
  it('draws nothing until every population is placed', () => {
    fixtures.placement = { placed: [], failures: new Map(), settled: false };
    const { result } = render(false, [DEFAULT, INPUTS]);

    expect(result.current.cells).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  // Emptying the scene while the newly selected population's morphology names
  // and orientations load would unmount the viewer, giving a black frame and
  // then a camera reset.
  it('keeps the scene on screen until the newly selected population can be drawn in full', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0]) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
    };
    const { result, rerender } = render(false, [DEFAULT, INPUTS]);
    const shown = result.current.cells;

    // The detail hook has nothing yet for the new population.
    fixtures.detail = null;
    rerender({ population: INPUTS, populations: [DEFAULT, INPUTS], showAxons: false });

    expect(result.current.cells).toBe(shown);
    expect(result.current.isLoading).toBe(false);

    fixtures.detail = placement([10, 0, 0]);
    rerender({ population: INPUTS, populations: [DEFAULT, INPUTS], showAxons: false });

    // Same cells and same positions; only which one is drawn in full changes.
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false&soma-only',
      'circuit-id/inputs #0?axons=false',
    ]);
    expect(result.current.cells.map((cell) => cell.center)).toEqual(
      shown.map((cell) => cell.center)
    );
  });

  // The error panel would otherwise sit on the previous population's cells, and
  // 'Try again' would remount the viewer with their ids while `loadCell` answers
  // for the new population, repainting the old scene as bare somas.
  it('drops the scene when the newly selected population fails to load', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0]) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
    };
    const { result, rerender } = render(false, [DEFAULT, INPUTS]);
    expect(result.current.cells).toHaveLength(2);

    fixtures.detail = null;
    fixtures.error = new Error('nodes.h5 could not be opened');
    rerender({ population: INPUTS, populations: [DEFAULT, INPUTS], showAxons: false });

    expect(result.current.cells).toEqual([]);
    expect(result.current.error).toBe(fixtures.error);
  });
  // Here hiding is a real saving rather than a repaint: the viewer asks
  // `loadCell` for every cell it is handed, so a population that contributes
  // none is a population whose morphologies are never asked of OBI-One.
  it('leaves a hidden population out of the scene, and puts it back where it was', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0]) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
    };
    const { result, rerender } = render(false, [DEFAULT, INPUTS], DEFAULT, ['inputs']);

    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false',
    ]);

    rerender({ population: DEFAULT, populations: [DEFAULT, INPUTS], showAxons: false });

    // The same id, in the same place, on both sides of the hide. What the
    // viewer sees is a subset and then a superset of the ids it already holds,
    // which is how it knows this is the scene it is standing in rather than a
    // new one to re-frame.
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false',
      'circuit-id/inputs #0?axons=false&soma-only',
    ]);
    expect(result.current.cells[0].center).toEqual([0, 0, 0]);
  });

  // An empty scene reads as a finished one, or the viewer sits on its loading
  // indicator for good: with no cells it is never mounted, so the progress the
  // indicator waits on never arrives.
  it('is not loading once every population has been hidden', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0]) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
    };
    const { result } = render(false, [DEFAULT, INPUTS], DEFAULT, ['default', 'inputs']);

    expect(result.current.cells).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  // Placement settles before the columns the population on show is drawn from
  // arrive, and in that gap there is nothing to draw and nothing drawn before.
  it('is still loading while the population on show has no columns yet', () => {
    fixtures.detail = null;
    const { result } = render(false);

    expect(result.current.cells).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('drops the population on show when that is the hidden one', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0]) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
    };
    const { result } = render(false, [DEFAULT, INPUTS], DEFAULT, ['default']);

    // What is left is the other population, still a receded soma: being the one
    // on show is not what puts a cell on screen, being unhidden is.
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/inputs #0?axons=false&soma-only',
    ]);
  });
});
