import { act, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportNodesTable } from '@/features/sonata-viewer/components/report-nodes-table';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { KeptNodesGrid } from '@/features/circuit-nodes/components/kept-nodes-grid';
import type { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';
import type { PinnedPathway } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type { ParsedCircuitConfig, ViewMode } from '@/features/circuit-nodes/types';
import type { PopulationMetadata } from '@/features/sonata-viewer/types';

const h = vi.hoisted(() => ({
  grid: null as ComponentProps<typeof KeptNodesGrid> | null,
  view: null as ComponentProps<typeof ConnectivityView> | null,
  setDerivedColumns: vi.fn(async () => {}),
  worker: null as unknown,
}));

vi.mock('@/features/circuit-nodes/components/kept-nodes-grid', () => ({
  KeptNodesGrid: (props: ComponentProps<typeof KeptNodesGrid>) => {
    h.grid = props;
    return <div data-testid="rows">{props.headerStart}</div>;
  },
  KeptNodesGridPlaceholder: () => null,
}));
vi.mock('@/features/circuit-nodes/components/nodes-toolbar', () => ({
  NodesViewSelect: ({ onViewChange }: { onViewChange: (view: ViewMode) => void }) => (
    <button type="button" onClick={() => onViewChange('connectivity')}>
      to matrix
    </button>
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
    entries: [{ population: 'S1__S1__chemical', path: 'm.h5', size: null }],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/features/circuit-nodes/hooks/use-nodes-worker', () => ({
  nodesSessionKey: () => 'session',
  useNodesWorker: () => h.worker,
}));

const CIRCUIT = { id: 'c1', assets: [] } as unknown as ICircuit;
const CONFIG = {
  nodes: [{ name: 'S1', type: 'biophysical', file: 'nodes.h5' }],
  circuitAssetId: 'asset',
} as unknown as ParsedCircuitConfig;
const POPULATION = {
  name: 'S1',
  traces: [{ nodeId: 0 }, { nodeId: 1 }],
} as unknown as PopulationMetadata;
const PINNED: PinnedPathway = {
  pre: Uint32Array.from([0]),
  post: Uint32Array.from([1]),
  square: { matrix: 'm', pre: { start: 0, end: 1 }, post: { start: 1, end: 2 } },
  name: 'A → B',
  matrixCells: null,
};

async function table() {
  const onScopeChange = vi.fn();
  const onClearPicks = vi.fn();
  const onMatrixChange = vi.fn();
  await act(async () => {
    render(
      <Provider store={createStore()}>
        <ReportNodesTable
          circuit={CIRCUIT}
          circuitConfig={CONFIG}
          population={POPULATION}
          onVisibleTracesChange={vi.fn()}
          onCellClick={vi.fn()}
          selectedNodeIds={new Set()}
          onScopeChange={onScopeChange}
          onClearPicks={onClearPicks}
          onMatrixChange={onMatrixChange}
          matrixCells={Uint32Array.from([0, 1])}
        />
      </Provider>
    );
  });
  return { onScopeChange, onClearPicks, onMatrixChange };
}

beforeEach(() => {
  h.grid = null;
  h.view = null;
  h.setDerivedColumns.mockClear();
  h.worker = {
    status: 'ready',
    rowCount: 5,
    filteredCount: null,
    columns: [{ name: 'mtype', kind: 'categorical' }],
    datasource: { rowCount: 5, getRows: () => {} },
    error: null,
    progress: null,
    getColumn: vi.fn(),
    setDerivedColumns: h.setDerivedColumns,
    getFilteredIndices: vi.fn(async () => null),
    getRowIndex: vi.fn(),
    getRowOrder: vi.fn(),
  };
});

describe('a report’s table of cells', () => {
  it('goes to the matrix from its header, over the cells its host says', async () => {
    const { onMatrixChange } = await table();

    fireEvent.click(screen.getByRole('button', { name: 'to matrix' }));

    expect(screen.getByTestId('matrix')).toBeInTheDocument();
    expect(screen.getByTestId('rows').closest('.invisible')).not.toBeNull();
    expect(h.view?.selection).toMatchObject({ population: 'S1', rowCount: 5 });
    expect([...(h.view?.selection?.cells ?? [])]).toEqual([0, 1]);
    expect(onMatrixChange).toHaveBeenLastCalledWith({ pathway: null });
  });

  it('takes the matrix’s way back to every neuron through its own reset, and past the recorded cells', async () => {
    const { onScopeChange } = await table();
    fireEvent.click(screen.getByRole('button', { name: 'to matrix' }));
    expect(h.grid?.resetRequest).toBe(0);

    act(() => h.view?.selection?.onReset());

    expect(h.grid?.resetRequest).toBe(1);
    expect(onScopeChange).toHaveBeenCalledWith('all');
  });

  it('filters to a pathway pinned, its picks going, and pages in another’s rows', async () => {
    const { onClearPicks } = await table();
    fireEvent.click(screen.getByRole('button', { name: 'to matrix' }));
    const before = h.grid;

    await act(async () => h.view?.pin?.onPick(PINNED));

    expect(h.setDerivedColumns).toHaveBeenCalledWith(
      'matrix-pathway',
      expect.arrayContaining([expect.objectContaining({ name: 'matrix:pathway' })])
    );
    expect(onClearPicks).toHaveBeenCalled();
    expect(h.grid?.columns[0].name).toBe('matrix:pathway');
    expect(h.grid?.initialFilterModel).toHaveProperty('matrix:pathway');
    expect(h.grid?.filterScope).toBe('voltage:m/0-1/1-2');
    expect(h.grid?.pinnedVersion).not.toBe(before?.pinnedVersion);

    const another = { ...PINNED, square: { ...PINNED.square, post: { start: 0, end: 1 } } };
    const pinnedVersion = h.grid?.pinnedVersion;
    await act(async () => h.view?.pin?.onPick(another));

    expect(h.grid?.filterScope).toBe('voltage:m/0-1/0-1');
    expect(h.grid?.pinnedVersion).not.toBe(pinnedVersion);
  });
});
