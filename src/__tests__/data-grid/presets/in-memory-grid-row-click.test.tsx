import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
];

/**
 * A per-row action button whose ENTIRE hit area is an inline SVG icon — exactly how
 * the related-circuits download action renders. Clicking it lands on the `<svg>`
 * (an `SVGElement`, NOT an `HTMLElement`), which is what used to slip past the
 * grid's interactive-target guard and open the row.
 */
const columns: Array<ISimpleColumn<Row>> = [
  {
    id: '__action',
    header: '',
    width: { width: 48, minWidth: 48 },
    renderCell: () => (
      <button type="button" aria-label="Row action" data-testid="row-action">
        <svg data-testid="row-action-icon" viewBox="0 0 16 16" role="img" aria-label="download">
          <path d="M0 0h16v16H0z" />
        </svg>
      </button>
    ),
  },
  { id: 'name', header: 'Name', field: 'name' },
];

function renderGrid(onRowClick: (row: Row) => void) {
  return render(
    <InMemoryGrid<Row>
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      onRowClick={onRowClick}
    />
  );
}

/**
 * AG Grid dispatches `cellClicked` asynchronously, so a bare `expect(...).not
 * .toHaveBeenCalled()` right after a click passes even when the row DOES open.
 * Every test therefore clicks a plain cell LAST and waits for that (legitimate)
 * row-open to arrive — by then any earlier, illegitimate one has flushed too.
 */
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

describe('InMemoryGrid row-open guard', () => {
  it('does NOT open the row when a per-row action button is clicked', async () => {
    const onRowClick = vi.fn();
    const { container, findAllByTestId } = renderGrid(onRowClick);

    const buttons = await findAllByTestId('row-action');
    fireEvent.click(buttons[0]);

    await clickPlainCellAndFlush(container, onRowClick);
    // only the plain-cell click opened a row
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: 'b' });
  });

  it('does NOT open the row when the SVG glyph INSIDE the action button is clicked', async () => {
    const onRowClick = vi.fn();
    const { container, findAllByTestId } = renderGrid(onRowClick);

    // the real-world path: the icon fills the button, so the click target is the SVG
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
