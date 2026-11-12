/**
 * Regression: AG Grid only adds what `getRowClass` returns when a row's data changes, so
 * a hierarchy row greyed out once stayed grey, and its scope icon kept its old state.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

interface Row {
  id: string;
  isFiltered: boolean;
}

const columns: Array<ISimpleColumn<Row>> = [
  {
    id: 'mark',
    header: 'Mark',
    field: 'id',
    renderCell: (row) => <span data-testid={`mark-${row.id}`}>{String(row.isFiltered)}</span>,
  },
];

const rowClass = (row: Row) => (row.isFiltered ? 'filtered-in' : 'filtered-out');

function renderGrid(rows: Row[]) {
  return render(
    <InMemoryGrid<Row> columns={columns} rows={rows} getRowId={(r) => r.id} getRowClass={rowClass} />
  );
}

const rowOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.ag-center-cols-container [row-id="a"]');

describe('InMemoryGrid row class on a data change', () => {
  it('drops the old class and refreshes the cells of a row whose class changed', async () => {
    const { container, rerender, findByTestId } = renderGrid([{ id: 'a', isFiltered: false }]);
    await waitFor(() => expect(rowOf(container)?.classList).toContain('filtered-out'));

    rerender(
      <InMemoryGrid<Row>
        columns={columns}
        rows={[{ id: 'a', isFiltered: true }]}
        getRowId={(r) => r.id}
        getRowClass={rowClass}
      />
    );

    // the stale row already holds both classes, so wait on the old one leaving
    await waitFor(() => expect(rowOf(container)?.classList).not.toContain('filtered-out'));
    expect(rowOf(container)?.classList).toContain('filtered-in');
    expect((await findByTestId('mark-a')).textContent).toBe('true');
  });
});
