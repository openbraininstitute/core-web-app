import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultOperatorRegistry,
  createInitialState,
  GridController,
  resolveColumns,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';

import type { IGridSchema } from '@/features/data-grid/core';
import type { ICellRendererProps } from '@/features/data-grid/react';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
];

const ACTION_RENDERER = 'action';

function ActionCell(_props: ICellRendererProps<Row>) {
  return (
    <button type="button" aria-label="Row action" data-testid="row-action">
      <svg data-testid="row-action-icon" viewBox="0 0 16 16" role="img" aria-label="act">
        <path d="M0 0h16v16H0z" />
      </svg>
    </button>
  );
}

const SCHEMA: IGridSchema<Row> = {
  id: 'test',
  getRowId: (r) => r.id,
  columns: [
    { id: 'action', header: '', cellRenderer: ACTION_RENDERER, width: { width: 48, minWidth: 48 } },
    { id: 'name', header: 'Name', getValue: (r) => r.name },
  ],
};

function renderGrid(onRowClick: (row: Row) => void) {
  const controller = new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    defaultPageSize: 20,
  });
  const cellRenderers = new CellRendererRegistry().register(ACTION_RENDERER, ActionCell);

  return render(
    <AgGridRenderer<Row>
      controller={controller}
      columns={resolveColumns(SCHEMA, controller.context)}
      rows={ROWS}
      total={ROWS.length}
      loading={false}
      state={createInitialState(SCHEMA, controller.context, 20)}
      operators={createDefaultOperatorRegistry()}
      cellRenderers={cellRenderers}
      onRowClick={onRowClick}
    />
  );
}

/** AG Grid dispatches `cellClicked` asynchronously; clicking a plain cell last flushes it. */
async function clickPlainCellAndFlush(
  container: HTMLElement,
  onRowClick: ReturnType<typeof vi.fn>
) {
  await waitFor(() => expect(container.textContent).toContain('Beta'));
  const cells = container.querySelectorAll<HTMLElement>('.ag-cell[col-id="name"]');
  const betaCell = Array.from(cells).find((c) => c.textContent?.includes('Beta'));
  if (!betaCell) throw new Error('expected a rendered "Beta" name cell');
  fireEvent.click(betaCell);
  await waitFor(() => expect(onRowClick).toHaveBeenCalled());
}

describe('AgGridRenderer row-open guard', () => {
  it('does NOT open the row when an in-cell button is clicked', async () => {
    const onRowClick = vi.fn();
    const { container, findAllByTestId } = renderGrid(onRowClick);

    const buttons = await findAllByTestId('row-action');
    fireEvent.click(buttons[0]);

    await clickPlainCellAndFlush(container, onRowClick);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: 'b' });
  });

  it('does NOT open the row when the SVG glyph INSIDE the button is clicked', async () => {
    const onRowClick = vi.fn();
    const { container, findAllByTestId } = renderGrid(onRowClick);

    const icons = await findAllByTestId('row-action-icon');
    fireEvent.click(icons[0]);

    await clickPlainCellAndFlush(container, onRowClick);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: 'b' });
  });

  it('DOES open the row when a normal (non-interactive) cell is clicked', async () => {
    const onRowClick = vi.fn();
    const { container } = renderGrid(onRowClick);

    await waitFor(() => expect(container.textContent).toContain('Alpha'));

    const cell = container.querySelector<HTMLElement>('.ag-cell[col-id="name"]');
    if (!cell) throw new Error('expected a rendered "name" cell');
    fireEvent.click(cell);

    await waitFor(() => expect(onRowClick).toHaveBeenCalledTimes(1));
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: 'a' });
  });
});
