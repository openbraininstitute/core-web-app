import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CircuitNodesTable from '@/features/circuit-nodes/circuit-nodes-table';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TableCells } from '@/features/circuit-nodes/circuit-nodes-table';
import type { NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import type { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';
import type { PinnedPathway } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type { FilterModel, ViewMode } from '@/features/circuit-nodes/types';

const h = vi.hoisted(() => ({
  grid: null as ComponentProps<typeof NodesGrid> | null,
  view: null as ComponentProps<typeof ConnectivityView> | null,
  // Stable, as the worker's own are.
  columns: [{ name: 'mtype', kind: 'categorical' as const }],
  setDerivedColumns: vi.fn(async () => {}),
  getFilteredIndices: vi.fn(async (filter: FilterModel) =>
    'matrix:pathway' in filter ? Uint32Array.from([0, 1]) : null
  ),
}));

vi.mock('@/features/circuit-nodes/components/nodes-grid', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/circuit-nodes/components/nodes-grid')>()),
  NodesGrid: (props: ComponentProps<typeof NodesGrid>) => {
    h.grid = props;
    return <div data-testid="grid" />;
  },
}));
vi.mock('@/features/circuit-nodes/components/nodes-toolbar', () => ({
  NodesToolbar: ({ onViewChange }: { onViewChange: (view: ViewMode) => void }) => (
    <>
      <button type="button" onClick={() => onViewChange('connectivity')}>
        to matrix
      </button>
      <button type="button" onClick={() => onViewChange('nodes')}>
        to nodes
      </button>
    </>
  ),
}));
vi.mock('@/features/circuit-nodes/connectivity/connectivity-view', () => ({
  ConnectivityView: (props: ComponentProps<typeof ConnectivityView>) => {
    h.view = props;
    return <div data-testid="matrix" />;
  },
}));
vi.mock('@/features/circuit-nodes/connectivity/use-connectivity', () => ({
  connectivityAsset: () => ({ id: 'asset' }),
  useConnectivityEntries: () => ({
    asset: { id: 'asset' },
    entries: [{ population: 'cortex__cortex__chemical', path: 'm.h5', size: null }],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: {
      nodes: [{ name: 'cortex', type: 'biophysical', file: 'nodes.h5' }],
      circuitAssetId: 'asset',
    },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/features/circuit-nodes/hooks/use-nodes-worker', () => ({
  useNodesWorker: () => ({
    rowCount: 6,
    filteredCount: null,
    columns: h.columns,
    datasource: {},
    status: 'ready',
    getColumn: vi.fn(),
    setDerivedColumns: h.setDerivedColumns,
    getFilteredIndices: h.getFilteredIndices,
    getRowIndex: vi.fn(),
    isLoading: false,
    progress: null,
    error: null,
  }),
}));

const CIRCUIT = { id: 'c1', assets: [] } as unknown as ICircuit;
const PINNED: PinnedPathway = {
  pre: Uint32Array.from([0]),
  post: Uint32Array.from([1]),
  square: { matrix: 'm', pre: 0, post: 1 },
  name: 'A → B',
  matrixCells: null,
};

const CELLS: TableCells = {
  onShownCellsChange: vi.fn(),
  onHoveredCellChange: vi.fn(),
};

function table(cells?: TableCells) {
  render(
    <Provider store={createStore()}>
      <CircuitNodesTable circuit={CIRCUIT} cells={cells} />
    </Provider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'to matrix' }));
}

beforeEach(() => {
  h.grid = null;
  h.view = null;
  vi.mocked(CELLS.onShownCellsChange).mockClear();
});

describe('the circuit’s nodes table and its matrix', () => {
  it('offers a click on the matrix only with a view beside the table', () => {
    table();

    expect(h.view?.pin).toBeUndefined();
  });

  it('narrows the view beside it at once, and its rows on the way back', async () => {
    table(CELLS);

    await act(async () => h.view?.pin?.onPick(PINNED));

    await waitFor(() =>
      expect(CELLS.onShownCellsChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ cells: Uint32Array.from([0, 1]) })
      )
    );
    expect(h.view?.pin?.pinned).toBe(PINNED);

    fireEvent.click(screen.getByRole('button', { name: 'to nodes' }));

    expect(h.grid?.columns.map((c) => c.name)).toEqual(['matrix:pathway', 'mtype']);
    expect(Object.keys(h.grid?.initialFilterModel ?? {})).toEqual(['matrix:pathway']);
    await waitFor(() => expect(h.grid?.visibleColumns.has('matrix:pathway')).toBe(true));
  });

  it('lets go through the table’s own way back to every neuron', async () => {
    table(CELLS);
    await act(async () => h.view?.pin?.onPick(PINNED));

    await act(async () => h.view?.selection?.onReset());

    expect(h.view?.pin?.pinned).toBeNull();
  });
});
