import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources/use-small-circuit-source';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';
import type { CellColors } from '@/features/circuit-viewer/morphologies/types';

const DEFAULT: NodePopulation = { name: 'default', type: 'biophysical', file: 'nodes.h5' };
const OTHER: NodePopulation = { name: 'other', type: 'biophysical', file: 'nodes.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

/**
 * One population's placement, as this viewer asks the hook to read it: positions, orientations where given, and the
 * morphology each node names, null for a population that names none, as an input population does.
 */
function placement(
  positions: number[],
  morphologies: string[] | null = null,
  turned = true
): NodeGeometry {
  const count = positions.length / 3;
  const orientations = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) orientations.set([0, 0, 1, 0], 4 * i);
  return {
    count,
    positions: new Float32Array(positions),
    orientations: turned ? orientations : null,
    morphologies,
  } as NodeGeometry;
}

// Hoisted so the module factories below, which run before the test body, can read them.
const fixtures = vi.hoisted(() => ({
  config: {
    nodes: [
      { name: 'default', type: 'biophysical', file: 'nodes.h5' },
      { name: 'inputs', type: 'virtual', file: 'inputs.h5' },
    ],
    edges: [],
    circuitAssetId: 'asset',
    // Every population inherits the components directory, so `type` is the only thing keeping `inputs` off the
    // detailed path.
    raw: {
      components: { morphologies_dir: 'morphologies' },
      networks: {
        nodes: [
          {
            nodes_file: 'nodes.h5',
            populations: { default: { type: 'biophysical' }, inputs: { type: 'virtual' } },
          },
        ],
      },
    },
  } as unknown,
  configError: null as Error | null,
  placement: { placed: [], failures: new Map(), settled: true, download: null } as ReturnType<
    typeof usePopulationsPlacement
  >,
}));

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

vi.mock('@/api/one/circuit-visualization', () => ({
  circuitMorphologyPath: (circuitId: string, file: string, name: string) =>
    `${circuitId}/${file}?name=${name}`,
}));

const circuit = { id: 'circuit-id' } as ICircuit;

type TProps = {
  population: NodePopulation;
  populations?: NodePopulation[];
  hiddenPopulations?: string[];
  recededColor?: string;
};

function render(
  populations?: NodePopulation[],
  population = DEFAULT,
  hiddenPopulations?: string[]
) {
  const initialProps: TProps = { population, populations, hiddenPopulations };
  return renderHook(
    (props: TProps) =>
      useSmallCircuitSource({
        circuit,
        ...props,
        populations: props.populations ?? [props.population],
        recededColor: props.recededColor ?? '#cccccc',
      }),
    { initialProps }
  );
}

/** Each cell's colour, through its column. */
const colorsOf = ({ palette, columnByCell }: CellColors) =>
  Array.from(columnByCell, (column) => palette[column]);

function placed(...entries: [NodePopulation, NodeGeometry][]) {
  fixtures.placement = {
    placed: entries.map(([population, geometry]) => ({ population, geometry })),
    failures: new Map(),
    settled: true,
    download: null,
  };
}

describe('useSmallCircuitSource', () => {
  beforeEach(() => {
    fixtures.configError = null;
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])]);
  });

  it("asks for each cell's morphology where OBI-One serves it, in the workspace", () => {
    const { result } = render();
    expect(result.current.tree?.requests).toEqual([
      {
        path: expect.stringMatching(/^circuit-id\/.*morph-a/),
        virtualLabId: 'lab',
        projectId: 'project',
      },
    ]);
  });

  it('stands a population with no morphologies as receded somas that read nothing', () => {
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])], [INPUTS, placement([10, 0, 0])]);
    const { result } = render([DEFAULT, INPUTS]);
    const { tree, cellColors, anchor } = result.current;

    // Declared order, every cell numbered through the populations.
    expect(Array.from(tree?.somas.positions ?? [])).toEqual([0, 0, 0, 10, 0, 0]);
    expect(tree?.somas.populations).toEqual([
      { name: 'default', cells: 1 },
      { name: 'inputs', cells: 1 },
    ]);
    expect(tree?.requests[1]).toBeNull();
    expect(colorsOf(cellColors)[1]).toBe('#cccccc');
    // The anchor stays on the population on show; the other one sits 10 away.
    expect(anchor).toEqual([0, 0, 0]);
  });

  it('stands a virtual population as somas even where it names morphologies', () => {
    placed(
      [DEFAULT, placement([0, 0, 0], ['morph-a'])],
      [INPUTS, placement([10, 0, 0], ['morph-b'])]
    );
    const { result } = render([DEFAULT, INPUTS]);
    expect(result.current.tree?.requests.map((request) => request !== null)).toEqual([true, false]);
  });

  it("turns each cell by its population's orientations, and leaves one without them unturned", () => {
    placed(
      [DEFAULT, placement([0, 0, 0], ['morph-a'])],
      [OTHER, placement([10, 0, 0], ['morph-b'], false)]
    );
    const { result } = render([DEFAULT, OTHER]);
    expect(Array.from(result.current.tree?.orientations ?? [])).toEqual([0, 0, 1, 0, 0, 0, 0, 1]);
  });

  it('draws a lone cell in its sections’ colours, and a crowd in flat ones, the rest receded', () => {
    expect(colorsOf(render().result.current.cellColors)).toEqual([SECTION_TYPE_COLORS]);

    placed(
      [DEFAULT, placement([0, 0, 0], ['morph-a'])],
      [OTHER, placement([10, 0, 0, 20, 0, 0], ['morph-b', 'morph-c'])]
    );
    const { result } = render([DEFAULT, OTHER], OTHER);
    // The view's own colour for the population on show, which colour-by has nothing to say of here.
    expect(colorsOf(result.current.cellColors)).toEqual(['#cccccc', null, null]);
  });

  it('keeps the morphologies of a population read when one with none goes on show', () => {
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])], [INPUTS, placement([10, 0, 0])]);
    const { result } = render([DEFAULT, INPUTS], INPUTS);
    expect(result.current.tree?.requests[0]).not.toBeNull();
    expect(colorsOf(result.current.cellColors)[0]).toBe('#cccccc');
  });

  // A morphology location is a section id and an offset with no cell of its own, so it is read against the
  // population on show; offered the whole scene it would mark every cell of every population whose morphology
  // happens to number a section the same way.
  it('offers only the cells of the population on show that have a morphology for locations', () => {
    placed(
      [DEFAULT, placement([0, 0, 0, 1, 0, 0, 2, 0, 0], ['morph-a', '', 'morph-b'])],
      [OTHER, placement([10, 0, 0], ['morph-c'])]
    );
    const { result } = render([DEFAULT, OTHER]);
    expect(result.current.locationCells).toEqual([0, 2]);
  });

  it('draws nothing until every population is placed', () => {
    fixtures.placement = { placed: [], failures: new Map(), settled: false, download: null };
    const { result } = render([DEFAULT, INPUTS]);
    expect(result.current.tree).toBeNull();
    expect(result.current.error).toBeNull();
  });

  /**
   * Nothing is read again on a switch: every population's morphology names and orientations arrived together, and the
   * selection decides colour alone. Another scene would be read and framed anew.
   */
  it('changes colour alone when another population goes on show', () => {
    placed(
      [DEFAULT, placement([0, 0, 0], ['morph-a'])],
      [OTHER, placement([10, 0, 0], ['morph-b'])]
    );
    const { result, rerender } = render([DEFAULT, OTHER]);
    const { tree } = result.current;
    expect(colorsOf(result.current.cellColors)[1]).toBe('#cccccc');

    rerender({ population: OTHER, populations: [DEFAULT, OTHER] });

    expect(result.current.tree).toBe(tree);
    expect(colorsOf(result.current.cellColors)[0]).toBe('#cccccc');
    expect(colorsOf(result.current.cellColors)[1]).not.toBe('#cccccc');
  });

  // An input population carrying no positions is the ordinary case, and the circuit is drawable without it.
  it('draws on when a population cannot be placed, nothing receding behind the one on show', () => {
    fixtures.placement = {
      placed: [{ population: DEFAULT, geometry: placement([0, 0, 0], ['morph-a']) }],
      failures: new Map([['inputs', new Error('no x/y/z columns')]]),
      settled: true,
      download: null,
    };
    const { result } = render([DEFAULT, INPUTS], INPUTS);

    expect(result.current.error).toBeNull();
    expect(result.current.tree?.somas.populations).toEqual([{ name: 'default', cells: 1 }]);
    // No colour of its own anywhere: every cell in the view's.
    expect(result.current.cellColors.palette).toEqual([]);
  });

  it('fails only once no population at all could be placed', () => {
    const failure = new Error('nodes.h5 could not be opened');
    fixtures.placement = {
      placed: [],
      failures: new Map([['default', failure]]),
      settled: true,
      download: null,
    };
    const { result } = render([DEFAULT]);
    expect(result.current.error).toBe(failure);
    expect(result.current.tree).toBeNull();
  });

  // The same cells, in the same places, on both sides of the hide: the view reads the same scene and keeps it framed.
  it('keeps a hidden population in the scene undrawn, its morphologies left unread', () => {
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])], [INPUTS, placement([10, 0, 0])]);
    const hidden = ['inputs'];
    const { result, rerender } = render([DEFAULT, INPUTS], DEFAULT, hidden);
    const { tree } = result.current;
    expect(colorsOf(result.current.cellColors)).toEqual([SECTION_TYPE_COLORS, false]);
    expect(result.current.hidden).toBe(hidden);

    rerender({ population: DEFAULT, populations: [DEFAULT, INPUTS] });
    expect(result.current.tree).toBe(tree);
    expect(colorsOf(result.current.cellColors)).toEqual([SECTION_TYPE_COLORS, '#cccccc']);
  });

  // The receded colour follows the background: with nothing on screen to recede, another background repaints nothing.
  it('recedes only where another population is on screen beside the one on show', () => {
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])], [INPUTS, placement([10, 0, 0])]);
    const hidden = ['inputs'];
    const { result, rerender } = render([DEFAULT, INPUTS], DEFAULT, hidden);
    const { cellColors } = result.current;

    rerender({
      population: DEFAULT,
      populations: [DEFAULT, INPUTS],
      hiddenPopulations: hidden,
      recededColor: '#333333',
    });
    expect(result.current.cellColors).toBe(cellColors);
  });

  it('keeps the scene once every population has been hidden', () => {
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])], [INPUTS, placement([10, 0, 0])]);
    const { result } = render([DEFAULT, INPUTS], DEFAULT, ['default', 'inputs']);
    expect(result.current.tree).not.toBeNull();
    expect(colorsOf(result.current.cellColors)).toEqual([false, false]);
  });

  it('hides the population on show when that is the hidden one, the rest still receded', () => {
    placed([DEFAULT, placement([0, 0, 0], ['morph-a'])], [INPUTS, placement([10, 0, 0])]);
    const { result } = render([DEFAULT, INPUTS], DEFAULT, ['default']);
    expect(colorsOf(result.current.cellColors)).toEqual([false, '#cccccc']);
    // Its locations go with it: nothing is drawn to mark them on.
    expect(result.current.locationCells).toEqual([]);
  });
});
