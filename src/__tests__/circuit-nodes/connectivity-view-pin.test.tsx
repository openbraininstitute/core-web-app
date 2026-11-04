import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';

import type {
  ConnectivityGroups,
  MatrixSide,
  SideWindow,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { PinnedPathway } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type {
  Figure,
  HoverPoint,
  PlotRanges,
} from '@/features/spike-viewer/spike-statistics/figures';

type PlotProps = {
  figure: Figure;
  onPointClick?: (point: HoverPoint) => void;
  onPointDoubleClick?: () => void;
  onPointHover?: (point: HoverPoint | null) => void;
  onRangesChange?: (ranges: PlotRanges) => void;
};

const h = vi.hoisted(() => ({
  plot: null as PlotProps | null,
  group: null as unknown as ReturnType<typeof vi.fn>,
  properties: [] as { name: string; kind: string; values?: string[] }[],
  neurons: 5,
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
        neurons: h.neurons,
        connections: 5,
        synapses: 14,
        properties: h.properties,
      },
    },
    key: 'matrix',
    group: h.group,
    retry: () => {},
  }),
}));

const A_B: MatrixSide = {
  start: 0,
  end: 2,
  step: 1,
  labels: ['A', 'B'],
  sizes: Float64Array.from([2, 3]),
  members: { offsets: Uint32Array.from([0, 2, 5]), nodeIds: Uint32Array.from([0, 1, 2, 3, 4]) },
};

/** Two groups, of 2 and 3 neurons. */
const GROUPS: ConnectivityGroups = {
  by: 'property',
  places: 2,
  pre: A_B,
  post: A_B,
  connections: Float64Array.from([2, 3, 0, 0]),
  synapses: Float64Array.from([5, 9, 0, 0]),
  totals: { connections: 5, synapses: 14 },
  runs: null,
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
/** A click, once it can no longer be the start of a double one. */
const click = (pre: number, post: number) => {
  vi.useFakeTimers();
  act(() => h.plot?.onPointClick?.({ pointNumber: [pre, post] }));
  act(() => vi.advanceTimersByTime(1000));
  vi.useRealTimers();
};

beforeEach(() => {
  h.plot = null;
  h.group = vi.fn(async () => GROUPS);
  h.properties = [{ name: 'mtype', kind: 'categorical', values: ['A', 'B'] }];
  h.neurons = 5;
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
    expect(pick.square).toMatchObject({ pre: { start: 0, end: 1 }, post: { start: 1, end: 2 } });
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

  it('pins nothing when it is half of a double click, which zooms out', async () => {
    const onPick = vi.fn();
    render(<Matrix onPick={onPick} />);
    await drawn();

    vi.useFakeTimers();
    act(() => h.plot?.onPointClick?.({ pointNumber: [0, 1] }));
    act(() => h.plot?.onPointDoubleClick?.());
    act(() => vi.advanceTimersByTime(1000));
    vi.useRealTimers();

    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('the matrix zoomed in, neuron by neuron', () => {
  const PLACES = 4870;
  const WHOLE = { start: 0, end: PLACES, step: 17 };

  /** What the worker answers: the stretch asked for, or all of the side. */
  function side(window: SideWindow): MatrixSide {
    const { start, end, step } = window;
    const lines = Math.ceil((end - start) / step);
    return {
      ...window,
      labels: Array.from({ length: lines }, (_, line) => `line ${line}`),
      sizes: Float64Array.from({ length: lines }, () => step),
      members: {
        offsets: Uint32Array.from({ length: lines + 1 }, (_, line) => line * step),
        nodeIds: Uint32Array.from({ length: end - start }, (_, i) => start + i),
      },
    };
  }
  const answer = (request: { window?: { pre: SideWindow; post: SideWindow } }) => {
    const pre = side(request.window?.pre ?? WHOLE);
    const post = side(request.window?.post ?? WHOLE);
    return {
      by: 'neuron',
      places: PLACES,
      pre,
      post,
      connections: new Float64Array(pre.labels.length * post.labels.length),
      synapses: null,
      totals: { connections: 123, synapses: null },
      runs: null,
    } as ConnectivityGroups;
  };

  /** Group by None: the matrix's first grouping, with no property to group by. */
  const shown = async () => {
    h.properties = [];
    h.neurons = PLACES;
    h.group = vi.fn(async (request) => answer(request));
    render(<Matrix cells={null} />);
    await drawn();
  };
  const zoomTo = (x: [number, number], y: [number, number]) =>
    act(async () => h.plot?.onRangesChange?.({ x, y }));
  const lastWindow = () => h.group.mock.lastCall?.[0].window;

  it('starts whole, saying how many neurons share each line', async () => {
    await shown();

    expect(lastWindow()).toBeUndefined();
    expect(
      screen.getByText('Each row and column is 17 neurons. Zoom in for single neurons')
    ).toBeInTheDocument();
  });

  it('asks for each side’s stretch, down to single neurons, and says so', async () => {
    await shown();

    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);

    expect(lastWindow()).toEqual({
      pre: { start: 100, end: 200, step: 1 },
      post: { start: 2000, end: 2100, step: 1 },
    });
    await waitFor(() => expect(h.plot?.figure.layout.yaxis?.ticktext?.at(0)).toBe('100'));
    expect(screen.queryByText(/Zoom in for single neurons/)).toBeNull();
  });

  it('says each side’s own size where they differ', async () => {
    await shown();

    await zoomTo([-0.5, 4869.5], [99.5, 199.5]);

    await screen.findByText(
      'Each row is one neuron and each column 17 neurons. Zoom in for single neurons'
    );
  });

  it('keeps the plot up, and its zoom, while the next lines are counted', async () => {
    await shown();
    const before = h.plot?.figure;
    let finish = (_: ConnectivityGroups) => {};
    h.group.mockImplementationOnce(
      (request) =>
        new Promise((resolve) => {
          finish = () => resolve(answer(request));
        })
    );

    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);

    expect(screen.getByTestId('plot')).toBeInTheDocument();
    expect(h.plot?.figure).toBe(before);

    await act(async () => finish(answer({})));

    expect(h.plot?.figure.layout.uirevision).toBe(before?.layout.uirevision);
    expect(h.plot?.figure.layout.xaxis?.range).toEqual(before?.layout.xaxis?.range);
  });

  it('goes back to all of it on zooming out, however far', async () => {
    await shown();
    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);

    await zoomTo([-0.5, 4869.5], [4869.5, -0.5]);
    expect(lastWindow()).toBeUndefined();

    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);
    await zoomTo([-900, 9000], [9000, -900]);
    expect(lastWindow()).toBeUndefined();
  });

  it('asks nothing new for a zoom that leaves the same lines in view', async () => {
    await shown();
    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);
    const asked = h.group.mock.calls.length;

    await zoomTo([2000, 2099], [100, 199]);

    expect(h.group.mock.calls.length).toBe(asked);
  });

  it('drops the zoom with another order or selection', async () => {
    h.properties = [];
    h.neurons = PLACES;
    h.group = vi.fn(async (request) => answer(request));
    const { rerender } = render(<Matrix cells={null} />);
    await drawn();
    const revision = h.plot?.figure.layout.uirevision;
    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);

    rerender(<Matrix cells={Uint32Array.from([1, 2, 3])} />);
    await waitFor(() => expect(h.group.mock.lastCall?.[1]).toHaveLength(3));

    expect(lastWindow()).toBeUndefined();
    await waitFor(() => expect(h.plot?.figure.layout.uirevision).not.toBe(revision));
  });

  it('pins a square by its places, which stay put through another zoom', async () => {
    const onPick = vi.fn();
    h.properties = [];
    h.neurons = PLACES;
    h.group = vi.fn(async (request) => answer(request));
    render(<Matrix cells={null} onPick={onPick} />);
    await drawn();

    // Row 2 and column 3 of lines of 17.
    click(2, 3);

    const [pick] = onPick.mock.lastCall as [PinnedPathway];
    expect(pick.square).toMatchObject({
      pre: { start: 34, end: 51 },
      post: { start: 51, end: 68 },
    });
    expect([...pick.pre]).toHaveLength(17);

    await zoomTo([39.5, 139.5], [19.5, 119.5]);
    await waitFor(() => expect(h.plot?.figure.layout.yaxis?.ticktext?.at(0)).toBe('20'));

    expect(h.plot?.figure.layout.shapes?.at(-1)).toMatchObject({
      x0: 50.5,
      x1: 67.5,
      y0: 33.5,
      y1: 50.5,
    });
  });

  it('tells a zoomed-in square’s own neurons to the view beside it', async () => {
    const onPathwayChange = vi.fn();
    h.properties = [];
    h.neurons = PLACES;
    h.group = vi.fn(async (request) => answer(request));
    render(<Matrix cells={null} onPathwayChange={onPathwayChange} />);
    await drawn();
    await zoomTo([1999.5, 2099.5], [99.5, 199.5]);
    await waitFor(() => expect(h.plot?.figure.layout.yaxis?.ticktext?.at(0)).toBe('100'));

    act(() => h.plot?.onPointHover?.({ pointNumber: [3, 4] }));

    const [told] = onPathwayChange.mock.lastCall as [{ pre: Uint32Array; post: Uint32Array }];
    expect([...told.pre]).toEqual([103]);
    expect([...told.post]).toEqual([2004]);
  });
});

describe('zooming a matrix grouped by a property', () => {
  it('asks for nothing: its lines are all already drawn', async () => {
    render(<Matrix />);
    await drawn();

    expect(h.plot?.onRangesChange).toBeUndefined();
  });
});
