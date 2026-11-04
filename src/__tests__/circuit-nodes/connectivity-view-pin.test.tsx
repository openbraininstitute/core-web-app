import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';

import type { ConnectivityGroups } from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { PinnedPathway } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type { Figure, HoverPoint } from '@/features/spike-viewer/spike-statistics/figures';

type PlotProps = {
  figure: Figure;
  onPointClick?: (point: HoverPoint) => void;
  onPointHover?: (point: HoverPoint | null) => void;
};

const h = vi.hoisted(() => ({
  plot: null as PlotProps | null,
  group: null as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: PlotProps) => {
    h.plot = props;
    return <div data-testid="plot" />;
  },
}));
vi.mock('@/features/circuit-nodes/connectivity/use-connectivity', () => ({
  useConnectivityDownloadGate: () => ({ waiting: false, checking: false, allow: () => {} }),
  useConnectivityMatrix: () => ({
    state: {
      status: 'ready',
      summary: {
        neurons: 5,
        connections: 5,
        synapses: 14,
        properties: [{ name: 'mtype', kind: 'categorical', values: ['A', 'B'] }],
      },
    },
    key: 'matrix',
    group: h.group,
    retry: () => {},
  }),
}));

/** Two groups, of 2 and 3 neurons. */
const GROUPS: ConnectivityGroups = {
  by: 'property',
  labels: ['A', 'B'],
  sizes: Float64Array.from([2, 3]),
  connections: Float64Array.from([2, 3, 0, 0]),
  synapses: Float64Array.from([5, 9, 0, 0]),
  runs: null,
  nodeIds: null,
  members: { offsets: Uint32Array.from([0, 2, 5]), nodeIds: Uint32Array.from([0, 1, 2, 3, 4]) },
};
const CELLS = Uint32Array.from([0, 1, 2]);
const STOP = 'Stop filtering to this pathway';

function Matrix({
  cells = CELLS,
  population = 'S1',
  onPick,
  onPathwayChange,
}: {
  cells?: Uint32Array | null;
  population?: string;
  onPick?: (next: PinnedPathway | null) => void;
  onPathwayChange?: (pathway: { pre: Uint32Array; post: Uint32Array } | null) => void;
}) {
  const [pinned, setPinned] = useState<PinnedPathway | null>(null);
  return (
    <ConnectivityView
      circuitId="c"
      assetId="a"
      entry={{ population: 'S1__S1__chemical', path: 'm.h5', description: '', size: null }}
      listing={{ isLoading: false, error: null, empty: false }}
      selection={{ cells, population, rowCount: 5, onReset: () => {} }}
      onPathwayChange={onPathwayChange}
      pin={{
        pinned,
        onPick: (next) => {
          onPick?.(next);
          setPinned(next);
        },
      }}
      headerSlot={null}
    />
  );
}

const drawn = () =>
  waitFor(() => {
    if (!h.plot) throw new Error('not drawn yet');
    return h.plot;
  });
const click = (pre: number, post: number) =>
  act(() => h.plot?.onPointClick?.({ pointNumber: [pre, post] }));

beforeEach(() => {
  h.plot = null;
  h.group = vi.fn(async () => GROUPS);
});

describe('a square clicked in the matrix', () => {
  it('pins its pathway, by its rows’ neurons, says so and rings it', async () => {
    const onPick = vi.fn();
    render(<Matrix onPick={onPick} />);
    await drawn();

    click(0, 1);

    const [pick] = onPick.mock.lastCall as [PinnedPathway];
    expect([...pick.pre]).toEqual([0, 1]);
    expect([...pick.post]).toEqual([2, 3, 4]);
    expect(pick.name).toBe('A → B');
    expect(pick.square).toMatchObject({ pre: 0, post: 1 });
    expect(screen.getByText('A → B').parentElement).toHaveTextContent(/^Filtered to\s*A → B$/);
    expect(h.plot?.figure.layout.shapes).toHaveLength(2);
  });

  it('leaves the matrix over the neurons it was over, whatever the table’s selection does', async () => {
    const { rerender } = render(<Matrix />);
    await drawn();

    click(0, 1);
    rerender(<Matrix cells={Uint32Array.from([0, 1])} />);
    await act(async () => {});

    expect(h.group.mock.lastCall?.[1]).toBe(CELLS);
  });

  it('keeps its pathway coloured beside the matrix, whatever is under the pointer', async () => {
    const onPathwayChange = vi.fn();
    render(<Matrix onPathwayChange={onPathwayChange} />);
    await drawn();

    click(0, 1);
    const [told] = onPathwayChange.mock.lastCall as [{ pre: Uint32Array; post: Uint32Array }];
    expect([...told.pre]).toEqual([0, 1]);
    expect([...told.post]).toEqual([2, 3, 4]);
    onPathwayChange.mockClear();

    act(() => h.plot?.onPointHover?.({ pointNumber: [1, 0] }));
    act(() => h.plot?.onPointHover?.(null));

    expect(onPathwayChange).not.toHaveBeenCalled();
  });

  it('lets go when clicked again', async () => {
    const onPick = vi.fn();
    const onPathwayChange = vi.fn();
    render(<Matrix onPick={onPick} onPathwayChange={onPathwayChange} />);
    await drawn();

    click(0, 1);
    click(0, 1);

    expect(onPick).toHaveBeenLastCalledWith(null);
    expect(onPathwayChange).toHaveBeenLastCalledWith(null);
    expect(h.plot?.figure.layout.shapes).toEqual([]);
    expect(screen.queryByRole('button', { name: STOP })).toBeNull();
  });

  it('moves to another square clicked', async () => {
    const onPick = vi.fn();
    render(<Matrix onPick={onPick} />);
    await drawn();

    click(0, 1);
    click(1, 1);

    expect(onPick.mock.lastCall?.[0]).toMatchObject({ name: 'B → B' });
  });

  it('lets go by the note’s button', async () => {
    const onPick = vi.fn();
    render(<Matrix onPick={onPick} />);
    await drawn();
    click(0, 1);

    fireEvent.click(screen.getByRole('button', { name: STOP }));

    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it('does nothing on a matrix not of the table’s population', async () => {
    render(<Matrix population="VPM" />);
    await drawn();

    expect(h.plot?.onPointClick).toBeUndefined();
  });
});
