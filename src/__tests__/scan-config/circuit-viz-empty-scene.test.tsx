import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitVisualization } from '@/features/scan-config/components/circuit-viz/circuit-viz';
import { QUIET_MS } from '@/features/scan-config/components/shared/visualization-loading-indicator';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { CircuitCellsProps } from '@/features/circuit-viewer/morphologies/circuit-cells';
import type { TreeSource } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import type { SmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources';

/** The label the loading indicator announces itself by with nothing to count. */
const LOADING = 'Loading visualization…';

const fixtures = vi.hoisted(() => ({
  source: {} as SmallCircuitSource,
  /** The props of each time the viewer was drawn. */
  mounted: [] as CircuitCellsProps[],
  /** Whether the form is taking morphology locations from the 3D view. */
  pickMode: null as string | null,
  morphologies: { data: null, loaded: 0, total: 0, failed: 0, retry: () => {} },
}));

// A WebGL surface.
vi.mock('@/features/circuit-viewer/morphologies/lazy-circuit-cells', () => ({
  LazyCircuitCells: (props: CircuitCellsProps) => {
    fixtures.mounted.push(props);
    return null;
  },
}));

vi.mock('@/features/scan-config/components/circuit-viz/sources', () => ({
  circuitDrawsSynapses: () => false,
  useSmallCircuitSource: () => fixtures.source,
}));

vi.mock('@/features/circuit-viewer/morphologies/use-tree-morphologies', () => ({
  useTreeMorphologies: () => fixtures.morphologies,
}));

// Reads the form and raises antd messages; none of that is what these turn on.
vi.mock('@/features/circuit-viewer/morphologies/use-location-selection', () => ({
  useLocationSelection: () => ({
    locations: undefined,
    hover: null,
    labels: [],
    pickMode: fixtures.pickMode,
  }),
}));

/** Two cells, one of each population. */
const TREE: TreeSource = {
  somas: {
    positions: new Float32Array(6),
    populations: [
      { name: 'default', cells: 1 },
      { name: 'other', cells: 1 },
    ],
  },
  orientations: null,
  placeholderRadius: 8,
  requests: [null, null],
};

/** A source in one of the states the view has to tell apart. */
function source(overrides: Partial<SmallCircuitSource>): SmallCircuitSource {
  return {
    tree: null,
    cellColors: { palette: [], columnByCell: new Uint16Array(0) },
    hidden: [],
    locationCells: [],
    isLoading: false,
    error: null,
    anchor: null,
    ...overrides,
  };
}

function draw(
  state: Partial<SmallCircuitSource>,
  {
    pickMode = null,
    onPopulationClick,
    morphologies = {},
  }: {
    pickMode?: string | null;
    onPopulationClick?: (name: string) => void;
    morphologies?: Partial<typeof fixtures.morphologies>;
  } = {}
) {
  fixtures.source = source(state);
  fixtures.mounted = [];
  fixtures.pickMode = pickMode;
  fixtures.morphologies = {
    data: null,
    loaded: 0,
    total: 0,
    failed: 0,
    retry: vi.fn(),
    ...morphologies,
  };
  render(
    <CircuitVisualization
      circuit={{ id: 'circuit-id', scale: 'microcircuit' } as ICircuit}
      population={{ name: 'default', type: 'biophysical', file: 'nodes.h5' }}
      populations={[]}
      showAxons={false}
      backgroundColor="#000000"
      signals={{} as never}
      onPopulationClick={onPopulationClick}
    />
  );
}

/** Past the quiet period the indicator holds itself back for. */
function waitOutTheQuietPeriod() {
  act(() => vi.advanceTimersByTime(QUIET_MS + 1));
}

describe('CircuitVisualization on an empty scene', () => {
  // Driven rather than waited out: on a slow runner an indicator that should not be there can outlast whatever
  // timeout the assertion carries.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reads a finished, empty scene as finished', () => {
    draw({ tree: null, isLoading: false });
    waitOutTheQuietPeriod();

    expect(screen.queryByRole('status')).toBeNull();
    expect(fixtures.mounted).toHaveLength(0);
  });

  it('still covers an empty scene that has not arrived yet', () => {
    draw({ tree: null, isLoading: true });
    waitOutTheQuietPeriod();

    expect(screen.getByLabelText(LOADING)).toBeInTheDocument();
  });

  it('draws the cells at once, and covers them while their morphologies are on their way', () => {
    draw({ tree: TREE }, { morphologies: { loaded: 0, total: 1 } });
    waitOutTheQuietPeriod();

    expect(fixtures.mounted.at(-1)).toMatchObject({
      somas: TREE.somas,
      somaRadius: 8,
      follow: true,
      crowding: false,
    });
    expect(screen.getByLabelText('Drawing morphologies… 0 of 1')).toBeInTheDocument();
  });

  it('says the morphologies could not be read where none could, and reads them again', () => {
    draw({ tree: TREE }, { morphologies: { loaded: 2, total: 2, failed: 2 } });
    expect(screen.getByRole('alert')).toHaveTextContent('The morphologies could not be read.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fixtures.morphologies.retry).toHaveBeenCalledTimes(1);
  });

  it('offers no try again for what the source failed at, which it would not read again', () => {
    draw({ error: new Error('nodes.h5 could not be opened') });
    expect(screen.getByRole('alert')).toHaveTextContent('nodes.h5 could not be opened');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('says nothing where some could be read', () => {
    draw({ tree: TREE }, { morphologies: { loaded: 2, total: 2, failed: 1 } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('CircuitVisualization clicks', () => {
  it('puts the population of the cell clicked on show', () => {
    const onPopulationClick = vi.fn();
    draw({ tree: TREE }, { onPopulationClick });
    const onCellClick = fixtures.mounted.at(-1)?.onCellClick;
    act(() => onCellClick?.(0));
    expect(onPopulationClick).not.toHaveBeenCalled();
    act(() => onCellClick?.(1));
    expect(onPopulationClick).toHaveBeenCalledExactlyOnceWith('other');
  });

  // One tap is both the cell click and the location pick. Left wired, a tap meant for a neurite would also put
  // another population on show, recolouring the scene and swapping the nodes table under the user.
  it('takes the population click off the tap while a morphology location is being placed', () => {
    draw({ tree: TREE }, { onPopulationClick: vi.fn() });
    expect(fixtures.mounted.at(-1)?.onCellClick).toBeDefined();

    draw({ tree: TREE }, { onPopulationClick: vi.fn(), pickMode: 'edit' });
    expect(fixtures.mounted.at(-1)?.onCellClick).toBeUndefined();
  });
});
