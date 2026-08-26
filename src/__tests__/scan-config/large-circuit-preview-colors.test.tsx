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

// The real one is a `next/dynamic` import of a WebGL renderer; here it is the
// thing under test — what the preview hands the viewer.
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

type TProps = { population: NodePopulation; nodeColors?: NodeColors; recededColor?: string };

function draw({ population, nodeColors, recededColor }: TProps) {
  return render(
    <LargeCircuitPreview
      circuit={circuit}
      population={population}
      populations={[CORTEX, VPM]}
      nodeColors={nodeColors}
      recededColor={recededColor}
      backgroundColor="#000000"
      signals={{} as never}
    />
  );
}

/** The props the viewer was last rendered with. */
function lastRender(): MorphoViewerSomasOnlyProps {
  const props = fixtures.rendered.at(-1);
  if (!props) throw new Error('The viewer was never rendered');
  return props;
}

/**
 * The colour each soma ends up sampling, read back through the palette. `null`
 * is the viewer's own occlusion ramp.
 */
function paints(props: MorphoViewerSomasOnlyProps): (string | null | undefined)[] {
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
    // Declared order, positions in it, so a soma keeps its index whichever
    // population is selected.
    expect(props.positions).toEqual(new Float32Array([0, 0, 0, 1, 1, 1, 9, 9, 9]));
  });

  // The whole point of the split: `positions` is a new scene to the viewer,
  // camera reset included, so a selection change must not touch it.
  it('hands back the same positions when only the selection changes', () => {
    const { rerender } = draw({
      population: CORTEX,
      nodeColors: asNodeColors(['#aaa', '#bbb']),
      recededColor: '#ccc',
    });
    const first = lastRender();

    rerender(
      <LargeCircuitPreview
        circuit={circuit}
        population={VPM}
        populations={[CORTEX, VPM]}
        nodeColors={asNodeColors(['#ddd'])}
        recededColor="#ccc"
        backgroundColor="#000000"
        signals={{} as never}
      />
    );
    const second = lastRender();

    expect(second.positions).toBe(first.positions);
    expect(paints(second)).toEqual(['#ccc', '#ccc', '#ddd']);
  });

  // One column for a whole population, not one per soma: the palette is a
  // texture a pixel wide per colour.
  it('gives one palette column to each distinct colour', () => {
    draw({ population: CORTEX, nodeColors: asNodeColors(['#aaa', '#aaa']), recededColor: '#ccc' });

    expect(lastRender().cellColors?.palette).toEqual(['#aaa', '#ccc']);
  });

  // Colour-by off, but another population is receded, so the scene needs a
  // palette to hold the grey — and the somas on show must not be flattened to
  // one hue on the way, which is what a colour of their own would do.
  it('leaves the nodes colour-by has nothing for to the viewer', () => {
    draw({ population: CORTEX, recededColor: '#ccc' });

    expect(paints(lastRender())).toEqual([null, null, '#ccc']);
  });

  // Nothing of ours to say: the viewer's own depth-shaded blue, which is what
  // a single-population circuit has always looked like.
  it('says nothing when there is one population and no colour-by', () => {
    fixtures.placement = {
      placed: [{ population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) }],
      failures: new Map(),
      settled: true,
    };
    draw({ population: CORTEX });

    expect(lastRender().cellColors?.palette).toEqual([]);
  });
});
