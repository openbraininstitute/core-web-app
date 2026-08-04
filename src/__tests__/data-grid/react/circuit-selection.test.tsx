import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import {
  createDefaultOperatorRegistry,
  GridController,
  isSelectionEnabled,
  SelectionMode,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { DataGrid, type IDataGridSelection } from '@/features/data-grid/react/data-grid';

import type { ReactNode } from 'react';
import type { IGridContext, IGridDataSource, IGridPage } from '@/features/data-grid/core';
import type { IGridRendererProps, TGridRenderer } from '@/features/data-grid/react/renderer';

/**
 * Regression: the Data → Circuit listing must have no checkboxes — the schema was opting
 * selection in on its own — while the workflow pickers' `selection` prop still forces it on.
 */
// biome-ignore lint/suspicious/noExplicitAny: the schema's Row is the augmented circuit row; the harness only needs an id
type Row = any;

function context(over: Partial<IGridContext> = {}): IGridContext {
  return { dataType: 'circuit', section: WorkspaceSection.Data, scope: 'public', ...over };
}

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function setup(selection?: IDataGridSelection<Row>) {
  const controller = new GridController<Row>({
    schema: circuitSchema,
    context: context(),
    defaultPageSize: 30,
  });
  const dataSource: IGridDataSource<Row> = {
    fetch: async (): Promise<IGridPage<Row>> => ({ rows: [], total: 0 }),
  };
  let received: IGridRendererProps<Row> | undefined;
  const spyRenderer: TGridRenderer = (props) => {
    received = props as unknown as IGridRendererProps<Row>;
    return null;
  };
  wrap(
    <DataGrid<Row>
      controller={controller}
      dataSource={dataSource}
      renderer={spyRenderer}
      operators={createDefaultOperatorRegistry()}
      cellRenderers={new CellRendererRegistry()}
      queryKey={['circuit']}
      showColumnChooser={false}
      selection={selection}
    />
  );
  return { getReceived: () => received };
}

describe('circuit — no schema-level selection', () => {
  it('declares no selection spec at all (selection is opt-in)', () => {
    expect(circuitSchema.selection).toBeUndefined();
  });

  it('resolves selection OFF in every context the listing can mount in', () => {
    for (const ctx of [
      context(),
      context({ section: WorkspaceSection.ExtractWorkflow }),
      context({ scope: 'private' }),
    ]) {
      expect(isSelectionEnabled(circuitSchema, ctx)).toBe(false);
    }
  });

  it('renders the browse listing with no selection column and no bulk-action selection', async () => {
    const { getReceived } = setup();
    await waitFor(() => expect(getReceived()).toBeDefined());
    expect(getReceived()?.selectionEnabled).toBe(false);
    expect(getReceived()?.selectionModeOverride).toBeUndefined();
  });
});

describe('circuit — the workflow PICKER path still selects', () => {
  it('a single (radio) picker forces selection on despite the schema opt-out', async () => {
    const { getReceived } = setup({ mode: SelectionMode.Single, onChange: vi.fn() });
    await waitFor(() => expect(getReceived()).toBeDefined());
    expect(getReceived()?.selectionEnabled).toBe(true);
    expect(getReceived()?.selectionModeOverride).toBe('single');
  });

  it('a multi (checkbox) picker forces selection on despite the schema opt-out', async () => {
    const { getReceived } = setup({ mode: SelectionMode.Multi, onChange: vi.fn() });
    await waitFor(() => expect(getReceived()).toBeDefined());
    expect(getReceived()?.selectionEnabled).toBe(true);
    expect(getReceived()?.selectionModeOverride).toBe('multiRow');
  });
});
