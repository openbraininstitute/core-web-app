import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  reportTableViewAtom,
  useReportTableView,
} from '@/features/circuit-nodes/connectivity/report-table-view';
import {
  TableOrMatrix,
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
  entries: [] as { population: string; path: string; size: number | null }[],
}));

vi.mock('@/features/circuit-nodes/connectivity/connectivity-view', () => ({
  ConnectivityView: (props: ComponentProps<typeof ConnectivityView>) => {
    h.view = props;
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

function Table({
  circuit = WITH_MATRIX,
  onMatrixChange,
}: {
  circuit?: ICircuit;
  onMatrixChange?: (matrix: SceneMatrix | undefined) => void;
}) {
  const view = useTableMatrixView(circuit);
  return (
    <TableOrMatrix
      view={view}
      circuit={circuit}
      population="S1"
      rowCount={10}
      cells={null}
      nodeColumns={undefined}
      onReset={vi.fn()}
      onMatrixChange={onMatrixChange}
      pin={{ pinned: null, onPick: vi.fn() }}
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
