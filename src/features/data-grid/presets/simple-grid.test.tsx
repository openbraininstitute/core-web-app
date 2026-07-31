import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OperatorId } from '../core';
import { buildSimpleColDefs, SimpleGrid } from './simple-grid';

import type { ReactNode } from 'react';
import type { GridDataSource, GridPage, GridQuery } from '../core';
import type { SimpleColumn } from './simple-grid';

function withQuery(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

interface Row {
  id: string;
  name: string;
  count: number;
  scan_parameters: Record<string, unknown>;
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha', count: 1, scan_parameters: { seed: 10 } },
  { id: 'b', name: 'Beta', count: 2, scan_parameters: { seed: 20 } },
  { id: 'c', name: 'Gamma', count: 3, scan_parameters: { seed: 30 } },
];

const columns: Array<SimpleColumn<Row>> = [
  { id: 'name', header: 'Name', field: 'name', width: { width: 200 }, pinned: 'left' },
  { id: 'seed', header: 'Seed', getValue: (r) => r.scan_parameters.seed as number },
  {
    id: 'status',
    header: 'Status',
    align: 'center',
    pinned: 'right',
    renderCell: (r) => <span data-testid="status-cell">{r.count > 1 ? 'many' : 'one'}</span>,
  },
];

describe('buildSimpleColDefs', () => {
  it('maps id, header and pinning', () => {
    const defs = buildSimpleColDefs(columns, { sortable: false });
    expect(defs.map((d) => d.colId)).toEqual(['name', 'seed', 'status']);
    expect(defs[0].headerName).toBe('Name');
    expect(defs[0].pinned).toBe('left');
    expect(defs[2].pinned).toBe('right');
  });

  it('uses field when there is no getValue/renderCell', () => {
    const [name] = buildSimpleColDefs(columns, { sortable: false });
    expect(name.field).toBe('name');
    expect(name.valueGetter).toBeUndefined();
    expect(name.cellRenderer).toBeUndefined();
  });

  it('wires getValue into a valueGetter', () => {
    const [, seed] = buildSimpleColDefs(columns, { sortable: false });
    expect(seed.field).toBeUndefined();
    expect(typeof seed.valueGetter).toBe('function');
    // @ts-expect-error narrow to the function form for the test
    expect(seed.valueGetter({ data: rows[1] })).toBe(20);
    // @ts-expect-error null-data path returns null, not undefined
    expect(seed.valueGetter({ data: undefined })).toBeNull();
  });

  it('wires renderCell into a cell renderer with the row-level render fn', () => {
    const [, , status] = buildSimpleColDefs(columns, { sortable: false });
    expect(status.cellRenderer).toBeTypeOf('function');
    expect(status.cellRendererParams?.render).toBe(columns[2].renderCell);
    expect(status.cellClass).toBe('ag-center-aligned-cell');
  });

  it('toggles client-side sorting via the option (opt-out per column)', () => {
    const off = buildSimpleColDefs(columns, { sortable: false });
    expect(off.every((d) => d.sortable === false)).toBe(true);

    const on = buildSimpleColDefs(
      [...columns, { id: 'locked', header: 'Locked', field: 'name', sortable: false }],
      { sortable: true }
    );
    expect(on[0].sortable).toBe(true);
    expect(on.at(-1)?.sortable).toBe(false);
  });
});

describe('SimpleGrid (jsdom mount)', () => {
  it('mounts AG Grid and renders row + column content', async () => {
    const { container } = render(
      <SimpleGrid columns={columns} rows={rows} getRowId={(r) => r.id} />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(container.querySelector('.ag-header-cell-text')).toBeInTheDocument();
    });
    expect(container.textContent).toContain('Alpha');
    expect(container.querySelectorAll('[data-testid="status-cell"]').length).toBeGreaterThan(0);
  });

  it('renders a pagination panel when pagination is enabled', async () => {
    const { container } = render(
      <SimpleGrid columns={columns} rows={rows} getRowId={(r) => r.id} pagination pageSize={2} />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-paging-panel')).toBeInTheDocument();
    });
  });

  it('collapses the header row when hideHeader is set', async () => {
    const { container } = render(
      <SimpleGrid columns={columns} rows={rows} getRowId={(r) => r.id} hideHeader />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument();
    });

    const header = container.querySelector<HTMLElement>('.ag-header');
    expect(header).not.toBeNull();
    // headerHeight={0} → collapsed header container (AG Grid adds a 1px border)
    expect(header?.style.height).toBe('1px');
  });

  it('keeps the header row when hideHeader is not set', async () => {
    const { container } = render(
      <SimpleGrid columns={columns} rows={rows} getRowId={(r) => r.id} />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-header-cell-text')).toBeInTheDocument();
    });

    const header = container.querySelector<HTMLElement>('.ag-header');
    // 48px headerHeight + AG Grid's 1px header border
    expect(header?.style.height).toBe('49px');
  });
});

describe('SimpleGrid row selection', () => {
  it('renders a radio selection column in single mode', async () => {
    const { container } = render(
      <SimpleGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowSelection={{ mode: 'single' }}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument();
    });

    await waitFor(() => {
      // one selection affordance per row (single mode = no header select-all)
      expect(container.querySelectorAll('.ag-selection-checkbox').length).toBe(rows.length);
    });
    expect(container.querySelector('.ag-header-select-all')).not.toBeInTheDocument();
  });

  it('renders checkboxes plus a header select-all in multi mode', async () => {
    const { container } = render(
      <SimpleGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowSelection={{ mode: 'multi' }}
      />
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.ag-selection-checkbox').length).toBe(rows.length);
    });
    expect(container.querySelector('.ag-header-select-all')).toBeInTheDocument();
  });

  it('applies controlled selectedIds onto the matching row', async () => {
    const { container } = render(
      <SimpleGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowSelection={{ mode: 'single', selectedIds: ['b'] }}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-row-selected')).toBeInTheDocument();
    });

    // pinned-left + center + pinned-right containers each render the row, so a
    // single selected logical row maps to several `.ag-row-selected` fragments
    const selectedIds = new Set(
      Array.from(container.querySelectorAll('.ag-row-selected')).map((el) =>
        el.getAttribute('row-id')
      )
    );
    expect([...selectedIds]).toEqual(['b']);
  });

  it('does not force selection when uncontrolled (no selectedIds)', async () => {
    const { container } = render(
      <SimpleGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowSelection={{ mode: 'single' }}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument();
    });
    expect(container.querySelector('.ag-row-selected')).not.toBeInTheDocument();
  });
});

// Opt-in enhanced mode: reuses the shared header filters, column chooser,
// store-driven sorting and pagination — the same stack as the entity grid.
const filterColumns: Array<SimpleColumn<Row>> = [
  {
    id: 'name',
    header: 'Name',
    field: 'name',
    sortable: true,
    filter: { operators: [OperatorId.Ilike] },
  },
  { id: 'seed', header: 'Seed', getValue: (r) => r.scan_parameters.seed as number },
];

describe('SimpleGrid enhanced mode', () => {
  it('stays on the basic path (no chooser/filter chrome) when no opt-in prop is set', async () => {
    const { container } = render(
      <SimpleGrid columns={filterColumns} rows={rows} getRowId={(r) => r.id} sortable />
    );
    await waitFor(() => {
      expect(container.querySelector('.ag-header-cell-text')).toBeInTheDocument();
    });
    expect(container.querySelector('[aria-label="Choose columns"]')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-label^="Filter "]')).not.toBeInTheDocument();
  });

  it('renders a filter icon for filterable columns when filterable is set', async () => {
    const { container } = withQuery(
      <SimpleGrid columns={filterColumns} rows={rows} getRowId={(r) => r.id} filterable />
    );
    await waitFor(() => {
      expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Filter Name"]')).toBeInTheDocument();
    });
    // the non-filterable column shows no filter icon
    expect(container.querySelector('[aria-label="Filter Seed"]')).not.toBeInTheDocument();
    expect(container.textContent).toContain('Alpha');
  });

  it('renders the column chooser control when showColumnChooser is set', async () => {
    const { container } = withQuery(
      <SimpleGrid columns={filterColumns} rows={rows} getRowId={(r) => r.id} showColumnChooser />
    );
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Choose columns"]')).toBeInTheDocument();
    });
  });

  it('renders a pagination panel in enhanced mode when paginating past one page', async () => {
    const { container } = withQuery(
      <SimpleGrid
        columns={filterColumns}
        rows={rows}
        getRowId={(r) => r.id}
        filterable
        pagination
        pageSize={2}
      />
    );
    await waitFor(() => {
      expect(container.querySelector('.ant-pagination')).toBeInTheDocument();
    });
  });
});

// ── Server mode: the data source resolves filter/sort/pagination; store changes
//    (page, sort) re-issue `dataSource.fetch` with the updated GridQuery. ──────────
interface SRow {
  id: string;
  name: string;
}

const serverRows: SRow[] = [
  { id: '1', name: 'One' },
  { id: '2', name: 'Two' },
  { id: '3', name: 'Three' },
];

const serverColumns: Array<SimpleColumn<SRow>> = [
  { id: 'name', header: 'Name', field: 'name', sortable: true },
];

/** A fake data source that records every query and paginates/sorts `serverRows`. */
function makeServerSource() {
  const fetch = vi.fn((query: GridQuery): Promise<GridPage<SRow>> => {
    const sorted = [...serverRows];
    if (query.sort[0]?.direction === 'desc') sorted.reverse();
    const start = (query.page - 1) * query.pageSize;
    return Promise.resolve({
      rows: sorted.slice(start, start + query.pageSize),
      total: serverRows.length,
    });
  });
  const dataSource: GridDataSource<SRow> = { fetch };
  return { fetch, dataSource };
}

describe('SimpleGrid server mode', () => {
  it('fetches page 1 via the data source and renders the server rows + pager', async () => {
    const { fetch, dataSource } = makeServerSource();
    const { container } = withQuery(
      <SimpleGrid
        columns={serverColumns}
        serverSide={{ dataSource, queryKey: ['srv'] }}
        getRowId={(r) => r.id}
        sortable
        pageSize={2}
      />
    );

    await waitFor(() => expect(container.textContent).toContain('One'));
    // server-paginated page 1 (size 2) = One, Two — Three is on page 2
    expect(container.textContent).toContain('Two');
    expect(container.textContent).not.toContain('Three');
    expect(fetch).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toMatchObject({ page: 1, pageSize: 2 });
    // total (3) > pageSize (2) → the pager is shown
    await waitFor(() => expect(container.querySelector('.ant-pagination')).toBeInTheDocument());
  });

  it('re-issues fetch with the new page and renders that page on a pagination change', async () => {
    const { fetch, dataSource } = makeServerSource();
    const { container } = withQuery(
      <SimpleGrid
        columns={serverColumns}
        serverSide={{ dataSource, queryKey: ['srv'] }}
        getRowId={(r) => r.id}
        sortable
        pageSize={2}
      />
    );

    await waitFor(() => expect(container.textContent).toContain('One'));

    const page2 = container.querySelector<HTMLElement>('.ant-pagination-item-2');
    if (!page2) throw new Error('expected a page-2 control in the pager');
    fireEvent.click(page2);

    // page 2 (size 2) = Three
    await waitFor(() => expect(container.textContent).toContain('Three'));
    expect(fetch.mock.calls.some(([q]) => q.page === 2)).toBe(true);
  });

  it('re-issues fetch with the updated sort when a sortable header is clicked', async () => {
    const { fetch, dataSource } = makeServerSource();
    const { container } = withQuery(
      <SimpleGrid
        columns={serverColumns}
        serverSide={{ dataSource, queryKey: ['srv'] }}
        getRowId={(r) => r.id}
        sortable
        pageSize={2}
      />
    );

    await waitFor(() => expect(container.textContent).toContain('One'));

    // the custom header's sort control is the label button carrying the column name
    const sortButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Name')
    );
    if (!sortButton) throw new Error('expected a sortable header button for "Name"');
    fireEvent.click(sortButton);

    // first click → descending sort on 'name' → a fresh fetch with the new query
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([q]) => q.sort[0]?.columnId === 'name' && q.sort[0]?.direction === 'desc'
        )
      ).toBe(true)
    );
    // desc: server page 1 (size 2) now = Three, Two
    await waitFor(() => expect(container.textContent).toContain('Three'));
  });

  it('does not fetch when the server mode is disabled (enabled: false)', async () => {
    const { fetch, dataSource } = makeServerSource();
    const { container } = withQuery(
      <SimpleGrid
        columns={serverColumns}
        serverSide={{ dataSource, queryKey: ['srv'], enabled: false }}
        getRowId={(r) => r.id}
        pageSize={2}
      />
    );

    await waitFor(() => expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalled();
  });
});
