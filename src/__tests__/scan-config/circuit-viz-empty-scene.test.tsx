import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CircuitVisualization } from '@/features/scan-config/components/circuit-viz/circuit-viz';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { SmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources';

/** The label the loading indicator announces itself by. */
const LOADING = 'Loading visualization…';

const fixtures = vi.hoisted(() => ({
  source: {} as SmallCircuitSource,
  /** One entry per time the viewer was mounted. */
  mounted: [] as unknown[],
}));

// A WebGL surface, and the thing whose absence this file is about. The section
// types come along because the location labels read them at module scope.
vi.mock('@/morpho-viewer', async () => ({
  ...(await vi.importActual<object>('@/morpho-viewer/tree-item-type')),
  MorphoViewerCircuitMultipleNeurons: (props: unknown) => {
    fixtures.mounted.push(props);
    return null;
  },
}));

vi.mock('@/features/scan-config/components/circuit-viz/sources', () => ({
  circuitDrawsSynapses: () => false,
  useSmallCircuitSource: () => fixtures.source,
}));

// Reads the form and raises antd messages; none of that is what a scene with no
// cells in it turns on.
vi.mock('@/features/scan-config/components/hooks/use-morphology-location-selection', () => ({
  useMorphologyLocationSelection: () => ({
    selection: undefined,
    hover: null,
    labels: [],
    pickMode: 'off',
  }),
}));

/** A source in one of the states the view has to tell apart. */
function source(overrides: Partial<SmallCircuitSource>): SmallCircuitSource {
  return {
    cells: [],
    loadCell: async () => null,
    isLoading: false,
    error: null,
    retry: vi.fn(),
    anchor: null,
    ...overrides,
  };
}

function draw(state: Partial<SmallCircuitSource>) {
  fixtures.source = source(state);
  fixtures.mounted = [];
  render(
    <CircuitVisualization
      circuit={{ id: 'circuit-id', scale: 'microcircuit' } as ICircuit}
      populations={[]}
      showAxons={false}
      backgroundColor="#000000"
      signals={{} as never}
    />
  );
}

describe('CircuitVisualization on an empty scene', () => {
  // The indicator waits on the viewer's own paint progress, and with no cells
  // the viewer is never mounted to report any — so waiting on it would leave
  // the indicator up for good over a scene the user emptied on purpose.
  it('reads a finished, empty scene as finished', () => {
    draw({ cells: [], isLoading: false });

    expect(screen.queryByLabelText(LOADING)).toBeNull();
    expect(fixtures.mounted).toHaveLength(0);
  });

  it('still covers an empty scene that has not arrived yet', () => {
    draw({ cells: [], isLoading: true });

    expect(screen.getByLabelText(LOADING)).toBeInTheDocument();
  });

  it('keeps covering a scene whose cells are placed but not yet painted', () => {
    const cell = {
      id: 'circuit-id/default #0',
      center: [0, 0, 0] as [number, number, number],
      orientation: [0, 0, 0, 1] as [number, number, number, number],
      somaRadius: 8,
    };
    draw({ cells: [cell], isLoading: false });

    // Mounted, and reporting no progress: the morphologies are still on their
    // way from OBI-One.
    expect(fixtures.mounted).toHaveLength(1);
    expect(screen.getByLabelText(LOADING)).toBeInTheDocument();
  });
});
