import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CircuitVisualization } from '@/features/scan-config/components/circuit-viz/circuit-viz';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { SmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources';

/** The label the loading indicator announces itself by with nothing to count. */
const LOADING = 'Loading visualization…';

const fixtures = vi.hoisted(() => ({
  source: {} as SmallCircuitSource,
  /** One entry per time the viewer was mounted. */
  mounted: [] as unknown[],
  /** Whether the form is taking morphology locations from the 3D view. */
  pickMode: null as string | null,
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
    pickMode: fixtures.pickMode,
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

function draw(
  state: Partial<SmallCircuitSource>,
  {
    pickMode = null,
    onPopulationClick,
  }: { pickMode?: string | null; onPopulationClick?: () => void } = {}
) {
  fixtures.source = source(state);
  fixtures.mounted = [];
  fixtures.pickMode = pickMode;
  render(
    <CircuitVisualization
      circuit={{ id: 'circuit-id', scale: 'microcircuit' } as ICircuit}
      populations={[]}
      showAxons={false}
      backgroundColor="#000000"
      signals={{} as never}
      onPopulationClick={onPopulationClick}
    />
  );
}

const CELL = {
  id: 'circuit-id/default #0',
  center: [0, 0, 0] as [number, number, number],
  orientation: [0, 0, 0, 1] as [number, number, number, number],
  somaRadius: 8,
};

describe('CircuitVisualization on an empty scene', () => {
  // The indicator waits on the viewer's own paint progress, and with no cells
  // the viewer is never mounted to report any. Waiting on it would leave the
  // indicator up for good over a scene the user emptied on purpose.
  it('reads a finished, empty scene as finished', async () => {
    draw({ cells: [], isLoading: false });

    // Waited out: the indicator holds itself back for a moment before it
    // appears, so an immediate check would read as absence either way. By role,
    // since which phase it would have named is not the point.
    await expect(screen.findByRole('status', {}, { timeout: 400 })).rejects.toThrow();
    expect(fixtures.mounted).toHaveLength(0);
  });

  it('still covers an empty scene that has not arrived yet', async () => {
    draw({ cells: [], isLoading: true });

    expect(await screen.findByLabelText(LOADING)).toBeInTheDocument();
  });

  it('keeps covering a scene whose cells are placed but not yet painted', async () => {
    draw({ cells: [CELL], isLoading: false });

    // Mounted, and reporting no progress: the morphologies are still on their
    // way from OBI-One, which is what the cover says it is waiting for.
    expect(fixtures.mounted).toHaveLength(1);
    expect(await screen.findByLabelText('Drawing morphologies… 0 of 1')).toBeInTheDocument();
  });
});

describe('CircuitVisualization while a morphology location is being placed', () => {
  // morphoviewer dispatches the cell click and the location pick from the same
  // tap. Left wired, a tap meant for a neurite would also put another
  // population on show, recolouring the scene and swapping the nodes table
  // under the user. The checklist still changes population.
  it('takes the population click off the tap', () => {
    const onCellClick = () => (fixtures.mounted[0] as { onCellClick?: unknown }).onCellClick;

    draw({ cells: [CELL] }, { onPopulationClick: vi.fn() });
    expect(onCellClick()).toBeDefined();

    draw({ cells: [CELL] }, { onPopulationClick: vi.fn(), pickMode: 'edit' });
    expect(onCellClick()).toBeUndefined();
  });
});
