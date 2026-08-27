import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LargeCircuitPreview } from '@/features/scan-config/components/model-preview/large-circuit-preview/large-circuit-preview';

import type { MorphoViewerSomasOnlyProps } from '@openbraininstitute/morphoviewer';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';

const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const VPM: NodePopulation = { name: 'vpm', type: 'virtual', file: 'inputs.h5' };

function placement(positions: number[]): NodeGeometry {
  return {
    count: positions.length / 3,
    positions: new Float32Array(positions),
    orientations: null,
    morphologies: null,
  };
}

/** The compact form the colour-by mapping hands the preview. */
function asNodeColors(byNode: string[]): NodeColors {
  const palette = [...new Set(byNode)];
  return {
    palette,
    columnByNode: Uint16Array.from(byNode, (color) => palette.indexOf(color)),
  };
}

// Hoisted so the module factories below, which run before the test body, can
// read them.
const fixtures = vi.hoisted(() => ({
  placement: { placed: [], failures: new Map(), settled: true } as ReturnType<
    typeof usePopulationsPlacement
  >,
  /** Every set of props the viewer has been rendered with, in order. */
  rendered: [] as MorphoViewerSomasOnlyProps[],
}));

// The real one is a `next/dynamic` import of a WebGL renderer. What the
// preview hands it is the thing under test.
vi.mock('@/morpho-viewer', () => ({
  MorphoViewerCircuitMultipleNeuronsSomaOnly: (props: MorphoViewerSomasOnlyProps) => {
    fixtures.rendered.push(props);
    return null;
  },
  useMorphoViewerDebugMode: () => false,
}));

vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: { circuitAssetId: 'asset', nodes: [CORTEX, VPM], edges: [], raw: {} },
    error: null,
  }),
}));

vi.mock('@/features/circuit-nodes/hooks/use-populations-placement', () => ({
  usePopulationsPlacement: () => fixtures.placement,
}));

const circuit = { id: 'circuit-id', name: 'Circuit' } as ICircuit;

type TProps = {
  population: NodePopulation;
  hiddenPopulations?: string[];
  nodeColors?: NodeColors;
  recededColor?: string;
  onPopulationClick?: (name: string) => void;
};

/** The element, so a rerender can vary one prop without restating the rest. */
function preview(props: TProps) {
  return (
    <LargeCircuitPreview
      circuit={circuit}
      populations={[CORTEX, VPM]}
      backgroundColor="#000000"
      signals={{} as never}
      {...props}
    />
  );
}

function draw(props: TProps) {
  return render(preview(props));
}

/** The props the viewer was last rendered with. */
function lastRender(): MorphoViewerSomasOnlyProps {
  const props = fixtures.rendered.at(-1);
  if (!props) throw new Error('The viewer was never rendered');
  return props;
}

/**
 * The colour each soma ends up sampling, read back through the palette. `null`
 * means the viewer's own occlusion ramp, `false` a soma the viewer does not
 * draw at all, and `undefined` a column the palette does not reach.
 */
function paints(props: MorphoViewerSomasOnlyProps): (string | null | false | undefined)[] {
  const colors = props.cellColors;
  if (!colors) throw new Error('The viewer was given no cellColors');
  return [...colors.columnByCell].map((column) => colors.palette[column]);
}

describe('LargeCircuitPreview colours', () => {
  beforeEach(() => {
    fixtures.rendered = [];
    fixtures.placement = {
      placed: [
        { population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) },
        { population: VPM, geometry: placement([9, 9, 9]) },
      ],
      failures: new Map(),
      settled: true,
    };
  });

  it('paints the population on show by node and the rest receded', () => {
    draw({ population: CORTEX, nodeColors: asNodeColors(['#aaa', '#bbb']), recededColor: '#ccc' });

    const props = lastRender();
    expect(paints(props)).toEqual(['#aaa', '#bbb', '#ccc']);
    // Declared order, and positions follow it, so a soma keeps its index
    // whichever population is selected.
    expect(props.positions).toEqual(new Float32Array([0, 0, 0, 1, 1, 1, 9, 9, 9]));
  });

  // The viewer treats a new `positions` array as a new scene and resets the
  // camera, so a selection change must not touch it.
  it('hands back the same positions when only the selection changes', () => {
    const { rerender } = draw({
      population: CORTEX,
      nodeColors: asNodeColors(['#aaa', '#bbb']),
      recededColor: '#ccc',
    });
    const first = lastRender();

    rerender(
      preview({ population: VPM, nodeColors: asNodeColors(['#ddd']), recededColor: '#ccc' })
    );
    const second = lastRender();

    expect(second.positions).toBe(first.positions);
    expect(paints(second)).toEqual(['#ccc', '#ccc', '#ddd']);
  });

  // One column for a whole population rather than one per soma, since the
  // palette is a texture one pixel wide per colour.
  it('gives one palette column to each distinct colour', () => {
    draw({ population: CORTEX, nodeColors: asNodeColors(['#aaa', '#aaa']), recededColor: '#ccc' });

    expect(lastRender().cellColors?.palette).toEqual(['#aaa', '#ccc']);
  });

  // Colour-by is off, but another population is receded, so the scene still
  // needs a palette to hold the grey. The somas on show must not be flattened
  // to a single hue in the process, which giving them a colour would do.
  it('leaves the nodes colour-by has nothing for to the viewer', () => {
    draw({ population: CORTEX, recededColor: '#ccc' });

    expect(paints(lastRender())).toEqual([null, null, '#ccc']);
  });

  // Nothing to colour by, so the viewer keeps its own depth-shaded blue, which
  // is how a single-population circuit has always looked.
  it('says nothing when there is one population and no colour-by', () => {
    fixtures.placement = {
      placed: [{ population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) }],
      failures: new Map(),
      settled: true,
    };
    draw({ population: CORTEX });

    expect(lastRender().cellColors?.palette).toEqual([]);
  });
  // The regression test for the whole design: hiding is a repaint, not a new
  // scene. If `positions` changes identity here, the viewer refits the camera
  // and the user loses the view they were standing at.
  it('takes a population out of the scene without moving the somas that stay', () => {
    const props: TProps = {
      population: CORTEX,
      nodeColors: asNodeColors(['#aaa', '#bbb']),
      recededColor: '#ccc',
    };
    const { rerender } = draw(props);
    const first = lastRender();

    rerender(preview({ ...props, hiddenPopulations: ['vpm'] }));
    const second = lastRender();

    expect(second.positions).toBe(first.positions);
    // `false`, not a transparent colour: the viewer skips the soma outright,
    // and derives what is unpickable from the same entry.
    expect(paints(second)).toEqual(['#aaa', '#bbb', false]);
  });

  // Taking the selection out of the scene leaves nothing in it that is the
  // selection, which is what the receded colour says. The viewer's own ramp
  // would say the opposite: the rest of the circuit lighting up blue the moment
  // the user unticks the population being coloured.
  it('keeps the rest receded when the subject is the hidden one', () => {
    draw({
      population: CORTEX,
      hiddenPopulations: ['cortex'],
      nodeColors: asNodeColors(['#aaa', '#bbb']),
      recededColor: '#ccc',
    });

    expect(paints(lastRender())).toEqual([false, false, '#ccc']);
  });

  // An empty scene is a finished state. The gate on to the viewer must not read
  // it as one still loading, or the user watches a spinner for good.
  it('still hands the viewer a scene when every population is hidden', () => {
    draw({ population: CORTEX, hiddenPopulations: ['cortex', 'vpm'] });

    expect(paints(lastRender())).toEqual([false, false, false]);
  });

  // The viewer builds its pick buffer on the first click, which at region scale
  // is a second copy of every position. With nothing pickable left on screen,
  // that is a copy paid for nothing.
  it('withdraws the click handler once the only other population is hidden', () => {
    const props: TProps = { population: CORTEX, onPopulationClick: vi.fn() };
    const { rerender } = draw(props);
    expect(lastRender().onCellClick).toBeDefined();

    rerender(preview({ ...props, hiddenPopulations: ['vpm'] }));
    expect(lastRender().onCellClick).toBeUndefined();
  });
});
