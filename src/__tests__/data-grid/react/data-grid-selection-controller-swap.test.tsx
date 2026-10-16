/**
 * Regression: switching the browse scope while the picker held selections blew up with
 * "Maximum update depth exceeded" — the swap gives the grid a new store while `<DataGrid>`
 * and its `lastEmittedRef` baseline survive, so the store→host emit and the host→store
 * controlled sync each acted on the other's pre-swap value. Asserts the loop itself
 * (bounded emits, no throw), not the symptom.
 *
 * The basket now travels through `createSelectionPersistence`, i.e. the NEW store is built
 * holding it. The empty frame that used to exist between the swap and an effect-time
 * restore is what made the picker emit a phantom change and the bulk-action row cache
 * prune itself, so these tests assert the very first render of the new controller.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
  SelectionMode,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { DataGrid } from '@/features/data-grid/react/data-grid';
import { createSelectionPersistence } from '@/features/data-grid/react/persistence/storage-persistence';

import type { ReactNode } from 'react';
import type {
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
} from '@/features/data-grid/core';
import type { TGridRenderer } from '@/features/data-grid/react/renderer';

interface Row {
  id: string;
  name: string;
}

const schema: IGridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
};

const PICKED: Row = { id: 'a', name: 'A' };

const emptySource: IGridDataSource<Row> = {
  fetch: async (_q: IGridQuery): Promise<IGridPage<Row>> => ({ rows: [], total: 0 }),
};

const nullRenderer: TGridRenderer = () => null;

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('DataGrid selection survives a controller swap', () => {
  it('restores ordinary grid selection when the scope creates a new controller', async () => {
    const renderedSelections: string[][] = [];

    function Host({ scopeKey }: { scopeKey: string }) {
      const controller = useMemo(
        () =>
          new GridController<Row>({
            schema,
            context: { dataType: 't', scope: scopeKey },
            instanceKey: `t/${scopeKey}`,
            persistence: [createSelectionPersistence('shared-basket')],
            defaultPageSize: 30,
          }),
        [scopeKey]
      );
      useEffect(() => {
        if (scopeKey === 'public') {
          controller.store.dispatch({
            type: GridActionType.SetSelection,
            ids: [PICKED.id],
          });
        }
      }, [controller, scopeKey]);

      return (
        <DataGrid<Row>
          controller={controller}
          dataSource={emptySource}
          renderer={(props) => {
            renderedSelections.push([...props.state.selection]);
            return null;
          }}
          operators={createDefaultOperatorRegistry()}
          cellRenderers={new CellRendererRegistry()}
          queryKey={['t', scopeKey]}
          showColumnChooser={false}
        />
      );
    }

    const { rerender } = wrap(<Host scopeKey="public" />);
    await waitFor(() => expect(renderedSelections.at(-1)).toEqual([PICKED.id]));

    const rendersBeforeSwap = renderedSelections.length;
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <Host scopeKey="project" />
      </QueryClientProvider>
    );
    await waitFor(() => expect(renderedSelections.at(-1)).toEqual([PICKED.id]));
    // the point of building the store with the basket: no frame ever sees it empty, which
    // is what the picker emit and the bulk-action row cache both react to
    expect(renderedSelections.slice(rendersBeforeSwap)).not.toContainEqual([]);
  });

  it('starts empty when no shared basket is wired (isolated)', async () => {
    const renderedSelections: string[][] = [];

    function Host({ scopeKey }: { scopeKey: string }) {
      const controller = useMemo(
        () =>
          new GridController<Row>({
            schema,
            context: { dataType: 't', scope: scopeKey },
            defaultPageSize: 30,
          }),
        [scopeKey]
      );
      useEffect(() => {
        if (scopeKey === 'public') {
          controller.store.dispatch({
            type: GridActionType.SetSelection,
            ids: [PICKED.id],
          });
        }
      }, [controller, scopeKey]);

      return (
        <DataGrid<Row>
          controller={controller}
          dataSource={emptySource}
          renderer={(props) => {
            renderedSelections.push([...props.state.selection]);
            return null;
          }}
          operators={createDefaultOperatorRegistry()}
          cellRenderers={new CellRendererRegistry()}
          queryKey={['t', scopeKey]}
          showColumnChooser={false}
        />
      );
    }

    const { rerender } = wrap(<Host scopeKey="public" />);
    await waitFor(() => expect(renderedSelections.at(-1)).toEqual([PICKED.id]));

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <Host scopeKey="project" />
      </QueryClientProvider>
    );
    await waitFor(() => expect(renderedSelections.at(-1)).toEqual([]));
  });

  it('settles (bounded emits) and keeps the host picks when the controller is replaced', async () => {
    const emitted: Row[][] = [];

    function Host({ scopeKey }: { scopeKey: string }) {
      const [selected, setSelected] = useState<Row[]>([PICKED]);
      const onChange = useCallback((rows: Row[]) => {
        emitted.push(rows);
        setSelected(rows);
      }, []);
      // mirrors EntityDataGrid: a NEW controller whenever the listing key changes
      const controller = useMemo(
        () =>
          new GridController<Row>({
            schema,
            context: { dataType: 't', scope: scopeKey },
            instanceKey: `picker/${scopeKey}`,
            persistence: [createSelectionPersistence('picker-basket')],
            defaultPageSize: 30,
          }),
        [scopeKey]
      );
      return (
        <DataGrid<Row>
          controller={controller}
          dataSource={emptySource}
          renderer={nullRenderer}
          operators={createDefaultOperatorRegistry()}
          cellRenderers={new CellRendererRegistry()}
          queryKey={['t', scopeKey]}
          showColumnChooser={false}
          selection={{ mode: SelectionMode.Multi, selectedRows: selected, onChange }}
        />
      );
    }

    const { rerender } = wrap(<Host scopeKey="public" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const before = emitted.length;

    await act(async () => {
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <Host scopeKey="project" />
        </QueryClientProvider>
      );
      await new Promise((r) => setTimeout(r, 200));
    });

    // A swap is not a user pick. Emitting even once here is what reset the host form
    // (single-neuron-synaptome dropped `synapseSets` on every scope toggle).
    expect(emitted.length - before).toBe(0);
    expect(emitted.at(-1) ?? [PICKED]).toEqual([PICKED]);
  });
});
