import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  reportTableViewAtom,
  useReportTableView,
} from '@/features/circuit-nodes/connectivity/report-table-view';
import {
  KeptTablePlaceholder,
  TableMatrixKeeper,
  TableOrMatrix,
  useKeptTableTitle,
  useTableMatrixView,
} from '@/features/circuit-nodes/connectivity/table-matrix';
import { tablePaneTitle } from '@/features/circuit-nodes/types';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';
import type { SceneMatrix } from '@/features/circuit-nodes/connectivity/table-matrix';
import type { ViewMode } from '@/features/circuit-nodes/types';

const h = vi.hoisted(() => ({
  view: null as ComponentProps<typeof ConnectivityView> | null,
  mounts: 0,
  entries: [] as { population: string; path: string; size: number | null }[],
}));

vi.mock('@/features/circuit-nodes/connectivity/connectivity-view', () => ({
  ConnectivityView: (props: ComponentProps<typeof ConnectivityView>) => {
    h.view = props;
    useEffect(() => {
      h.mounts += 1;
    }, []);
    return <div data-testid="matrix">{props.entry?.population}</div>;
  },
}));
vi.mock('@/features/circuit-nodes/connectivity/use-connectivity', () => ({
  connectivityAsset: (circuit: { assets: unknown[] }) => circuit.assets[0],
  useConnectivityEntries: () => ({
    asset: { id: 'asset' },
    entries: h.entries,
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/features/circuit-nodes/components/nodes-toolbar', () => ({
  NodesViewSelect: ({
    view,
    onViewChange,
    connectivity,
  }: {
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    connectivity: boolean;
  }) => (
    <button
      type="button"
      disabled={!connectivity}
      onClick={() => onViewChange(view === 'nodes' ? 'connectivity' : 'nodes')}
    >
      view: {view}
    </button>
  ),
}));

const WITH_MATRIX = { id: 'c1', assets: [{ id: 'asset' }] } as unknown as ICircuit;
const ANOTHER_WITH_MATRIX = { id: 'c2', assets: [{ id: 'asset' }] } as unknown as ICircuit;
const WITHOUT_MATRIX = { id: 'c3', assets: [] } as unknown as ICircuit;
const ENTRY = { path: 'm.h5', size: null };
const PINNED = {
  pre: Uint32Array.from([0]),
  post: Uint32Array.from([1]),
  square: { matrix: 'm', pre: { start: 0, end: 1 }, post: { start: 1, end: 2 } },
  name: 'A → B',
  matrixCells: null,
};

function Table({
  circuit = WITH_MATRIX,
  onMatrixChange,
  onPick = vi.fn(),
  cells = null,
  nodeColumns,
}: {
  circuit?: ICircuit;
  onMatrixChange?: (matrix: SceneMatrix | undefined) => void;
  onPick?: () => void;
  cells?: Uint32Array | null | undefined;
  nodeColumns?: ComponentProps<typeof TableOrMatrix>['nodeColumns'];
}) {
  const view = useTableMatrixView(circuit);
  return (
    <TableOrMatrix
      view={view}
      session={`${circuit.id}/S1`}
      circuit={circuit}
      population="S1"
      rowCount={10}
      cells={cells}
      nodeColumns={nodeColumns}
      onReset={vi.fn()}
      onMatrixChange={onMatrixChange}
      pin={{ pinned: PINNED, onPick }}
      headerStart={<span>The population</span>}
    >
      <div data-testid="rows">{view.menu}</div>
    </TableOrMatrix>
  );
}

function renderTable(props: ComponentProps<typeof Table> = {}) {
  const store = createStore();
  const withStore = (next: ComponentProps<typeof Table>) => (
    <Provider store={store}>
      <Table {...next} />
    </Provider>
  );
  const view = render(withStore(props));
  return {
    ...view,
    rerenderWith: (next: ComponentProps<typeof Table>) => view.rerender(withStore(next)),
  };
}

const openMatrix = () => fireEvent.click(screen.getAllByRole('button', { name: 'view: nodes' })[0]);

beforeEach(() => {
  h.view = null;
  h.mounts = 0;
  h.entries = [{ population: 'S1__S1__chemical', ...ENTRY }];
});

describe('a report’s table and its matrix', () => {
  it('starts on the rows, with the matrix not read', () => {
    renderTable();

    expect(screen.getByTestId('rows').closest('.invisible')).toBeNull();
    expect(screen.queryByTestId('matrix')).toBeNull();
  });

  it('has nothing to go to for a circuit without a matrix', () => {
    renderTable({ circuit: WITHOUT_MATRIX });

    expect(screen.getByRole('button', { name: 'view: nodes' })).toBeDisabled();
  });

  it('keeps the rows mounted out of sight under the matrix, and the header’s start over it', () => {
    renderTable();

    openMatrix();

    expect(screen.getByTestId('matrix')).toBeInTheDocument();
    expect(screen.getByTestId('rows').closest('.invisible')).not.toBeNull();
    expect(screen.getByText('The population')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'view: connectivity' })[0]);

    expect(screen.queryByTestId('matrix')).toBeNull();
    expect(screen.getByTestId('rows').closest('.invisible')).toBeNull();
  });

  it('opens on the population’s own matrix, and offers the others', () => {
    h.entries = [
      { population: 'VPM__S1__chemical', ...ENTRY },
      { population: 'S1__S1__chemical', ...ENTRY },
    ];
    renderTable();

    openMatrix();

    expect(screen.getByTestId('matrix')).toHaveTextContent('S1__S1__chemical');
    expect(screen.getByText('Matrix')).toBeInTheDocument();
  });

  it('offers no choice of one matrix', () => {
    renderTable();

    openMatrix();

    expect(screen.queryByText('Matrix')).toBeNull();
  });

  it('stays on the matrix for the same circuit, and starts on the rows for another', () => {
    const { rerenderWith, unmount } = renderTable();
    openMatrix();

    rerenderWith({ circuit: ANOTHER_WITH_MATRIX });
    expect(screen.queryByTestId('matrix')).toBeNull();

    rerenderWith({ circuit: WITH_MATRIX });
    expect(screen.getByTestId('matrix')).toBeInTheDocument();
    unmount();
  });

  it('tells a scene beside it that it is up, and of its pathway, by circuit and population', () => {
    const onMatrixChange = vi.fn();
    renderTable({ onMatrixChange });
    expect(onMatrixChange).not.toHaveBeenCalled();

    openMatrix();
    expect(onMatrixChange).toHaveBeenLastCalledWith({ pathway: null });

    const pre = Uint32Array.from([0]);
    const post = Uint32Array.from([1]);
    act(() => h.view?.onPathwayChange?.({ pre, post }));
    expect(onMatrixChange).toHaveBeenLastCalledWith({
      pathway: { circuitId: 'c1', population: 'S1', rowCount: 10, pre, post },
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'view: connectivity' })[0]);
    expect(onMatrixChange).toHaveBeenLastCalledWith(undefined);
  });
});

describe('the matrix kept across report views', () => {
  function Loading() {
    return (
      <div>
        <span data-testid="title">{useKeptTableTitle()}</span>
        <KeptTablePlaceholder fallback={<span>waiting</span>} />
      </div>
    );
  }

  function renderKept() {
    const store = createStore();
    const page = (content: React.ReactNode) => (
      <Provider store={store}>
        <TableMatrixKeeper>{content}</TableMatrixKeeper>
      </Provider>
    );
    const view = render(page(<Table />));
    return { ...view, show: (content: React.ReactNode) => view.rerender(page(content)) };
  }

  it('stays mounted while the next report loads, and in the next report over the same cells', () => {
    const { show } = renderKept();
    openMatrix();
    expect(h.mounts).toBe(1);

    show(<Loading />);
    expect(screen.getByTestId('matrix')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Connectivity');
    expect(screen.queryByText('waiting')).toBeNull();

    show(<Table />);
    expect(screen.getByTestId('matrix')).toBeInTheDocument();
    expect(h.mounts).toBe(1);
  });

  it('is let go with the rows on show, and the loading pane is the table again', () => {
    const { show } = renderKept();
    openMatrix();

    fireEvent.click(screen.getAllByRole('button', { name: 'view: connectivity' })[0]);
    expect(screen.queryByTestId('matrix')).toBeNull();

    show(<Loading />);
    expect(screen.getByTestId('title')).toHaveTextContent('Neuron Table');
    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('keeps its cells until the next report knows its own, and an equal array as it was', () => {
    const columns = { columns: [], getColumn: vi.fn() };
    const kept = Uint32Array.from([1, 2]);
    const { show } = renderKept();
    show(<Table cells={kept} nodeColumns={columns} />);
    openMatrix();

    show(<Table cells={undefined} nodeColumns={undefined} />);
    expect(h.view?.selection?.cells).toBe(kept);

    show(<Table cells={Uint32Array.from([1, 2])} nodeColumns={columns} />);
    expect(h.view?.selection?.cells).toBe(kept);

    const other = Uint32Array.from([3]);
    show(<Table cells={other} nodeColumns={columns} />);
    expect(h.view?.selection?.cells).toBe(other);
    expect(h.mounts).toBe(1);
  });

  it('is mounted anew for other cells', () => {
    const { show } = renderKept();
    openMatrix();

    show(<Table circuit={ANOTHER_WITH_MATRIX} />);
    expect(screen.queryByTestId('matrix')).toBeNull();
    show(<Table />);

    expect(screen.getByTestId('matrix')).toBeInTheDocument();
    expect(h.mounts).toBe(2);
  });

  it('lets the pinned pathway go on a click on nothing in it', () => {
    const onPick = vi.fn();
    const store = createStore();
    render(
      <Provider store={store}>
        <TableMatrixKeeper>
          <Table onPick={onPick} />
        </TableMatrixKeeper>
      </Provider>
    );
    openMatrix();

    fireEvent.click(screen.getByTestId('matrix'));

    expect(onPick).toHaveBeenCalledExactlyOnceWith(null);
  });
});

describe('what a report table’s pane is told it shows', () => {
  function viewOf(circuit: ICircuit | undefined, chosenOn = WITH_MATRIX) {
    const store = createStore();
    store.set(reportTableViewAtom, { circuitId: chosenOn.id, view: 'connectivity' });
    const { result } = renderHook(() => useReportTableView(circuit), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    return result.current;
  }

  it('is the matrix on the circuit it was chosen for', () => {
    expect(viewOf(WITH_MATRIX)).toBe('connectivity');
  });

  it('is the nodes on another circuit, or one with no matrix, or with no circuit', () => {
    expect(viewOf(ANOTHER_WITH_MATRIX)).toBe('nodes');
    expect(viewOf(WITHOUT_MATRIX, WITHOUT_MATRIX)).toBe('nodes');
    expect(viewOf(undefined)).toBe('nodes');
  });

  it('names the pane’s bar by it', () => {
    expect(tablePaneTitle('connectivity')).toBe('Connectivity');
    expect(tablePaneTitle('nodes')).toBe('Neuron Table');
  });
});
