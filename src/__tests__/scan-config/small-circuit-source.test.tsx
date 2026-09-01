import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources/use-small-circuit-source';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';

const DEFAULT: NodePopulation = { name: 'default', type: 'biophysical', file: 'nodes.h5' };
const OTHER: NodePopulation = { name: 'other', type: 'biophysical', file: 'nodes.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

/**
 * One population's placement, as this viewer asks the hook to read it:
 * positions, orientations, and the morphology each node names. That last is
 * null for a population that names none, which is what an input population
 * looks like.
 */
function placement(positions: number[], morphologies: string[] | null = null): NodeGeometry {
  const count = positions.length / 3;
  const orientations = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) orientations[i * 4 + 3] = 1;
  return {
    count,
    positions: new Float32Array(positions),
    orientations,
    morphologies,
  };
}

// Hoisted so the module factories below, which run before the test body, can
// read them.
const fixtures = vi.hoisted(() => ({
  config: {
    nodes: [
      { name: 'default', type: 'biophysical', file: 'nodes.h5' },
      { name: 'inputs', type: 'virtual', file: 'inputs.h5' },
    ],
    edges: [],
    circuitAssetId: 'asset',
    raw: { components: { morphologies_dir: 'morphologies' } },
  } as unknown,
  configError: null as Error | null,
  placement: { placed: [], failures: new Map(), settled: true, download: null } as ReturnType<
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

vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({ config: fixtures.config, error: fixtures.configError }),
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
    fixtures.configError = null;
    fixtures.placement = {
      placed: [{ population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) }],
      failures: new Map(),
      settled: true,
      download: null,
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

  it('stands a population with no morphologies as receded somas that load nothing', async () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, INPUTS]);

    // Declared order, with ids that tell the populations apart.
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false',
      'circuit-id/inputs #0?axons=false',
    ]);
    expect(result.current.cells[1]).toMatchObject({ center: [10, 0, 0], color: '#cccccc' });
    // Marked, not left for the viewer to find out by asking: it counts the cells it is
    // waiting on, so one that will never answer has to be left out of that count.
    expect(result.current.cells.map((cell) => cell.somaOnly)).toEqual([false, true]);
    // The anchor stays on the population on show; the other one sits 10 away.
    expect(result.current.anchor).toEqual([0, 0, 0]);
    await expect(result.current.loadCell('circuit-id/inputs #0')).resolves.toBeNull();
  });

  /**
   * The regression this pins: a `virtual` population has no morphology to draw,
   * so making it the one on show used to take every morphology in the scene off
   * the screen and leave a field of grey dots with no way back but a click on
   * one of them.
   */
  it('keeps the morphologies drawn when a population with none goes on show', async () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, INPUTS], INPUTS);

    // `default` still draws its morphology, now receded; `inputs` is on show
    // and has nothing but its somas either way.
    expect(result.current.cells.map((cell) => cell.somaOnly)).toEqual([false, true]);
    expect(result.current.cells[0].color).toBe('#cccccc');
    // And it is still served, so the viewer has geometry to draw it from.
    await expect(result.current.loadCell('circuit-id/default #0')).resolves.not.toBeNull();
  });

  it('draws every population that has morphologies, receded except the one on show', async () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: OTHER, geometry: placement([10, 0, 0, 20, 0, 0], ['morph-b', 'morph-c']) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, OTHER]);

    expect(result.current.cells.map((cell) => cell.somaOnly)).toEqual([false, false, false]);
    expect(result.current.cells.map((cell) => cell.color)).toEqual([
      result.current.cells[0].color,
      '#cccccc',
      '#cccccc',
    ]);
    await expect(result.current.loadCell('circuit-id/other #1')).resolves.not.toBeNull();
  });

  // Built one time only, because the viewer re-fits every cell when the id set
  // changes.
  // A morphology location is a section id and an offset with no cell of its
  // own, so it is read against the population on show. Offered the whole scene
  // it would put a marker on every cell of every population whose morphology
  // happens to number a section the same way.
  it('offers only the population on show for morphology locations', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0, 1, 0, 0], ['morph-a', 'morph-b']) },
        { population: OTHER, geometry: placement([10, 0, 0], ['morph-c']) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, OTHER]);

    expect(result.current.cells).toHaveLength(3);
    expect(result.current.locationCells?.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false',
      'circuit-id/default #1?axons=false',
    ]);
  });

  it('draws nothing until every population is placed', () => {
    fixtures.placement = { placed: [], failures: new Map(), settled: false, download: null };
    const { result } = render(false, [DEFAULT, INPUTS]);

    expect(result.current.cells).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  /**
   * Nothing is re-read on a switch, so there is no gap to cover: every
   * population's morphology names and orientations arrived together, and the
   * selection decides colour alone.
   */
  it('changes colour alone when another population goes on show', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: OTHER, geometry: placement([10, 0, 0], ['morph-b']) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result, rerender } = render(false, [DEFAULT, OTHER]);
    const shown = result.current.cells;
    expect(shown[1].color).toBe('#cccccc');

    rerender({ population: OTHER, populations: [DEFAULT, OTHER], showAxons: false });

    // The ids have to be untouched: the viewer reads a scene whose ids it
    // already holds as the one it is standing in, and keeps the morphologies it
    // has drawn for it, so switching back does not reload them.
    expect(result.current.cells.map((cell) => cell.id)).toEqual(shown.map((cell) => cell.id));
    expect(result.current.cells.map((cell) => cell.center)).toEqual(
      shown.map((cell) => cell.center)
    );
    expect(result.current.cells.map((cell) => cell.somaOnly)).toEqual([false, false]);
    expect(result.current.cells[0].color).toBe('#cccccc');
    expect(result.current.cells[1].color).not.toBe('#cccccc');
  });

  // An input population carrying no positions is the ordinary case, and the
  // circuit is drawable without it. Failing the viewer over it would cover a
  // correct render with a panel about the one thing missing from it.
  it('draws on when a population cannot be placed', () => {
    fixtures.placement = {
      placed: [{ population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) }],
      failures: new Map([['inputs', new Error('no x/y/z columns')]]),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, INPUTS], INPUTS);

    expect(result.current.error).toBeNull();
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/default #0?axons=false',
    ]);
  });

  it('fails only once no population at all could be placed', () => {
    const failure = new Error('nodes.h5 could not be opened');
    fixtures.placement = {
      placed: [],
      failures: new Map([['default', failure]]),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT]);

    expect(result.current.error).toBe(failure);
    expect(result.current.cells).toEqual([]);
  });

  // Here hiding is a real saving rather than a repaint: the viewer asks
  // `loadCell` for every cell it is handed, so a population that contributes
  // none is a population whose morphologies are never asked of OBI-One.
  it('leaves a hidden population out of the scene, and puts it back where it was', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
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
      'circuit-id/inputs #0?axons=false',
    ]);
    expect(result.current.cells[0].center).toEqual([0, 0, 0]);
  });

  // An empty scene reads as a finished one, or the viewer sits on its loading
  // indicator for good: with no cells it is never mounted, so the progress the
  // indicator waits on never arrives.
  it('is not loading once every population has been hidden', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, INPUTS], DEFAULT, ['default', 'inputs']);

    expect(result.current.cells).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('drops the population on show when that is the hidden one', () => {
    fixtures.placement = {
      placed: [
        { population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) },
        { population: INPUTS, geometry: placement([10, 0, 0]) },
      ],
      failures: new Map(),
      settled: true,
      download: null,
    };
    const { result } = render(false, [DEFAULT, INPUTS], DEFAULT, ['default']);

    // What is left is the other population, still a receded soma: being the one
    // on show is not what puts a cell on screen, being unhidden is.
    expect(result.current.cells.map((cell) => cell.id)).toEqual([
      'circuit-id/inputs #0?axons=false',
    ]);
  });
});
