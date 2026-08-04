import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

interface Row {
  id: string;
  name: string;
  count: number;
  date: string;
}

const rows: Row[] = [{ id: 'a', name: 'Alpha', count: 2, date: '2024-01-01' }];

/**
 * Regression for the circuit Subcircuits column: `InMemoryGrid` builds its store
 * from the CONTEXT-RESOLVED schema, so a column behind a contextual `available`
 * gate is dropped from `columnOrder` while still being rendered from the props —
 * and an id missing from the stored order used to sort LAST, pushing the column
 * past every other one instead of leaving it in its declared slot.
 */
const columns: Array<ISimpleColumn<Row>> = [
  { id: 'name', header: 'Name', field: 'name' },
  // gated OUT of the resolved schema (and therefore out of `columnOrder`)
  { id: 'count', header: 'Subcircuits', field: 'count', available: false },
  { id: 'date', header: 'Experiment date', field: 'date' },
];

async function renderedColumnIds(container: HTMLElement): Promise<string[]> {
  await waitFor(() =>
    expect(container.querySelectorAll('.ag-header-cell').length).toBeGreaterThan(0)
  );
  return Array.from(container.querySelectorAll<HTMLElement>('.ag-header-cell'))
    .map((cell) => cell.getAttribute('col-id') ?? '')
    .filter((id) => id.length > 0 && !id.startsWith('ag-Grid'));
}

describe('InMemoryGrid column order', () => {
  it('renders a contextually-gated column in its DECLARED slot, not last', async () => {
    const { container } = render(
      <InMemoryGrid<Row> columns={columns} rows={rows} getRowId={(r) => r.id} />
    );

    await waitFor(() => expect(container.textContent).toContain('Alpha'));
    expect(await renderedColumnIds(container)).toEqual(['name', 'count', 'date']);
  });

  it('renders every declared column in order when nothing is gated', async () => {
    const plain = columns.map(({ available: _available, ...c }) => c);
    const { container } = render(
      <InMemoryGrid<Row> columns={plain} rows={rows} getRowId={(r) => r.id} />
    );

    await waitFor(() => expect(container.textContent).toContain('Alpha'));
    expect(await renderedColumnIds(container)).toEqual(['name', 'count', 'date']);
  });
});
