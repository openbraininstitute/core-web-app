import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TableCells } from '@/features/circuit-nodes/circuit-nodes-table';
import type { NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import type { FilterModel, NodePopulation } from '@/features/circuit-nodes/types';

type GridProps = ComponentProps<typeof NodesGrid>;

const fixtures = vi.hoisted(() => ({
  grid: vi.fn(),
  // Stable, as the worker's own are: the table asks again whenever they change.
  getFilteredIndices: vi.fn(async (filter: FilterModel) => {
    if ('broken' in filter) throw new Error('worker gone');
    return Object.keys(filter).length > 0 ? Uint32Array.from([1, 3, 4]) : null;
  }),
  getRowIndex: vi.fn(async () => 0),
  logError: vi.fn(),
}));

vi.mock('@/features/circuit-nodes/components/nodes-grid', () => ({
  NodesGrid: (props: unknown) => {
    fixtures.grid(props);
    return null;
  },
  defaultVisibleColumnSet: (columns: { name: string }[]) => new Set(columns.map((c) => c.name)),
}));
vi.mock('@/features/circuit-nodes/components/nodes-toolbar', () => ({ NodesToolbar: () => null }));
vi.mock('@/utils/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/logger')>()),
  logError: fixtures.logError,
}));
vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: { nodes: [CORTEX, THALAMUS], circuitAssetId: 'asset' },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/features/circuit-nodes/hooks/use-nodes-worker', () => ({
  useNodesWorker: () => ({
    rowCount: 6,
    filteredCount: null,
    columns: [{ name: 'mtype', kind: 'categorical' }],
    datasource: {},
    status: 'ready',
    getFilteredIndices: fixtures.getFilteredIndices,
    getRowIndex: fixtures.getRowIndex,
    isLoading: false,
    progress: null,
    error: null,
  }),
}));

import CircuitNodesTable from '@/features/circuit-nodes/circuit-nodes-table';

const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const THALAMUS: NodePopulation = { name: 'thalamus', type: 'biophysical', file: 'nodes.h5' };
const CIRCUIT = { id: 'c1', assets: [] } as unknown as ICircuit;
const OTHER_CIRCUIT = { id: 'c2', assets: [] } as unknown as ICircuit;
const FILTER: FilterModel = { mtype: { filterType: 'set', values: ['L5_MC'] } } as FilterModel;
const BROKEN: FilterModel = { broken: { filterType: 'set', values: ['x'] } } as FilterModel;

/** The props the grid was last rendered with. */
function grid(): GridProps {
  return fixtures.grid.mock.calls.at(-1)?.[0];
}

/** The cells last told to the view beside the table, as a plain list (null for all). */
function shown(onShownCellsChange: ReturnType<typeof vi.fn>) {
  const last = onShownCellsChange.mock.calls.at(-1)?.[0];
  return last && { population: last.population, cells: last.cells && [...last.cells] };
}

beforeEach(() => {
  fixtures.grid.mockClear();
  fixtures.getFilteredIndices.mockClear();
  fixtures.logError.mockClear();
});

/** What the grid's header says beside the count. */
function headerText() {
  const { container, unmount } = render(<div>{grid().headerExtra}</div>);
  const text = container.textContent ?? '';
  unmount();
  return text;
}

/** The table with a view beside it, telling that view the cells to show. */
function table(
  circuit: ICircuit,
  populationName: string,
  onShownCellsChange: TableCells['onShownCellsChange']
) {
  return (
    <CircuitNodesTable
      circuit={circuit}
      populationName={populationName}
      onPopulationChange={() => {}}
      cells={{ onShownCellsChange, onHoveredCellChange: vi.fn() }}
    />
  );
}

describe('CircuitNodesTable with cells', () => {
  it('shows the filter’s rows, else the ticked ones, and resets to every cell', async () => {
    const onShownCellsChange = vi.fn();
    const cells = { onShownCellsChange, onHoveredCellChange: vi.fn() };
    render(
      <CircuitNodesTable
        circuit={CIRCUIT}
        populationName="cortex"
        onPopulationChange={() => {}}
        cells={cells}
      />
    );
    await waitFor(() =>
      expect(shown(onShownCellsChange)).toEqual({ population: 'cortex', cells: null })
    );
    expect(grid().pickColumn).toBe(true);

    act(() => grid().onFilterModelChange?.(FILTER));
    await waitFor(() => expect(shown(onShownCellsChange)?.cells).toEqual([1, 3, 4]));

    act(() => grid().onRowClick?.(4));
    act(() => grid().onRowClick?.(1));
    expect(shown(onShownCellsChange)?.cells).toEqual([1, 4]);
    expect(grid().pickAll?.state).toBe('some');

    act(() => grid().pickAll?.onToggle());
    expect(grid().pickAll?.state).toBe('all');
    expect(shown(onShownCellsChange)?.cells).toEqual([1, 3, 4]);

    act(() => grid().reset?.onReset());
    expect(grid().selectedNodeIds?.size).toBe(0);
    expect(grid().pickAll?.state).toBe('none');
  });

  it('keeps ticks and filters with the population they were made over', async () => {
    const onShownCellsChange = vi.fn();
    const cells = { onShownCellsChange, onHoveredCellChange: vi.fn() };
    const { rerender } = render(
      <CircuitNodesTable
        circuit={CIRCUIT}
        populationName="cortex"
        onPopulationChange={() => {}}
        cells={cells}
      />
    );
    await waitFor(() => expect(onShownCellsChange).toHaveBeenCalled());
    act(() => grid().onFilterModelChange?.(FILTER));
    act(() => grid().onRowClick?.(3));
    expect(shown(onShownCellsChange)).toEqual({ population: 'cortex', cells: [3] });

    rerender(
      <CircuitNodesTable
        circuit={CIRCUIT}
        populationName="thalamus"
        onPopulationChange={() => {}}
        cells={cells}
      />
    );
    await waitFor(() =>
      expect(shown(onShownCellsChange)).toEqual({ population: 'thalamus', cells: null })
    );
    expect(grid().filterScope).toBe('c1/thalamus');
    expect(grid().initialFilterModel).toEqual({});
    expect(grid().selectedNodeIds?.size).toBe(0);

    rerender(
      <CircuitNodesTable
        circuit={CIRCUIT}
        populationName="cortex"
        onPopulationChange={() => {}}
        cells={cells}
      />
    );
    expect(shown(onShownCellsChange)).toEqual({ population: 'cortex', cells: [3] });
    expect(grid().initialFilterModel).toEqual(FILTER);
  });

  it('starts afresh on another circuit whose population has the same name', async () => {
    const onShownCellsChange = vi.fn();
    const { rerender } = render(table(CIRCUIT, 'cortex', onShownCellsChange));
    await waitFor(() => expect(onShownCellsChange).toHaveBeenCalled());
    act(() => grid().onFilterModelChange?.(FILTER));
    act(() => grid().onRowClick?.(3));
    expect(shown(onShownCellsChange)).toEqual({ population: 'cortex', cells: [3] });

    rerender(table(OTHER_CIRCUIT, 'cortex', onShownCellsChange));
    await waitFor(() =>
      expect(onShownCellsChange.mock.calls.at(-1)?.[0]).toMatchObject({
        circuitId: 'c2',
        population: 'cortex',
        cells: null,
      })
    );
    expect(grid().filterScope).toBe('c2/cortex');
    expect(grid().initialFilterModel).toEqual({});
    expect(grid().selectedNodeIds?.size).toBe(0);
  });

  it('ticks every row as a flag rather than a set of every index', async () => {
    const onShownCellsChange = vi.fn();
    render(table(CIRCUIT, 'cortex', onShownCellsChange));
    await waitFor(() =>
      expect(shown(onShownCellsChange)).toEqual({ population: 'cortex', cells: null })
    );

    act(() => grid().pickAll?.onToggle());
    const ticked = grid().selectedNodeIds;
    expect(ticked).not.toBeInstanceOf(Set);
    expect(ticked?.size).toBe(6);
    expect([0, 5, 6].map((row) => ticked?.has(row))).toEqual([true, true, false]);
    expect(grid().pickAll?.state).toBe('all');
    // Every cell ticked is every cell on show.
    expect(shown(onShownCellsChange)?.cells).toBeNull();

    act(() => grid().onRowClick?.(2));
    expect(grid().pickAll?.state).toBe('some');
    expect(shown(onShownCellsChange)?.cells).toEqual([0, 1, 3, 4, 5]);
  });

  it('says so when the filter’s rows cannot be found, and shows every cell', async () => {
    const onShownCellsChange = vi.fn();
    render(table(CIRCUIT, 'cortex', onShownCellsChange));
    act(() => grid().onFilterModelChange?.(FILTER));
    await waitFor(() => expect(shown(onShownCellsChange)?.cells).toEqual([1, 3, 4]));
    expect(headerText()).not.toMatch(/could not follow/);

    act(() => grid().onFilterModelChange?.(BROKEN));
    await waitFor(() => expect(shown(onShownCellsChange)?.cells).toBeNull());
    expect(headerText()).toMatch(/could not follow this filter/);
    expect(fixtures.logError).toHaveBeenCalledOnce();
  });

  it('leaves the grid as it was without cells', () => {
    render(
      <CircuitNodesTable circuit={CIRCUIT} populationName="cortex" onPopulationChange={() => {}} />
    );
    expect(grid().pickColumn).toBeUndefined();
    expect(grid().onRowClick).toBeUndefined();
    expect(fixtures.getFilteredIndices).not.toHaveBeenCalled();
  });
});
