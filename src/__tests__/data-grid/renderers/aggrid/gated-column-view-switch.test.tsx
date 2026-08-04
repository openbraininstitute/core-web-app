/**
 * Regression: a CONTEXTUALLY-GATED column must come back at its DECLARED slot when
 * the context that gates it is switched away and back.
 *
 * The circuit listing gates its "Subcircuits" column on the hierarchy view (see
 * `circuitSchema`). Switching to flat drops the column from the resolved set;
 * switching back re-adds it, and the host rebuilds the `GridController`, so the
 * renderer hands AG Grid a correctly-ordered column list either way. AG Grid,
 * however, OUTLIVES that swap — same grid instance — and with `maintainColumnOrder`
 * it keeps its own order and appends any column it has not seen before AFTER every
 * other one (`restoreColOrder` in ag-grid-community). On a wide listing that is
 * off-screen: the column reads as GONE until the page is reloaded.
 *
 * Driven through the real `AgGridRenderer` because the defect is entirely in what AG
 * Grid does with a correct column list — every layer above it is already right.
 */
import { act, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  byContext,
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
} from '@/features/data-grid/core';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';

import type { IColumnModel, IGridContext, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

interface Row {
  id: string;
  name: string;
}

const GATED = 'subcircuits';
const HIERARCHY = 'hierarchy';
const FLAT = 'flat';

const COLUMNS: Array<IColumnModel<Row>> = [
  { id: 'name', header: 'Name', getValue: (r) => r.name },
  {
    id: GATED,
    header: 'Subcircuits',
    // pinned exactly like the real column: its declared slot must win every refresh
    movable: false,
    available: byContext<boolean>({
      default: false,
      rules: [{ when: { view: HIERARCHY }, value: true }],
    }),
    getValue: () => '',
  },
  { id: 'description', header: 'Description', getValue: () => '' },
  { id: 'region', header: 'Region', getValue: () => '' },
];

const SCHEMA: IGridSchema<Row> = { id: 'gated', getRowId: (r) => r.id, columns: COLUMNS };

/** The host rebuilds the controller whenever a context factor changes. */
function makeController(view: string) {
  const context: IGridContext = { dataType: 'gated-entity', factors: { view } };
  return new GridController<Row>({ schema: SCHEMA, context, defaultPageSize: 10 });
}

function renderGrid(controller: GridController<Row>) {
  return (
    <AgGridRenderer<Row>
      controller={controller}
      columns={controller.resolvedColumns()}
      rows={[{ id: '1', name: 'c1' }]}
      total={1}
      loading={false}
      state={controller.store.getSnapshot()}
      operators={createDefaultOperatorRegistry()}
      cellRenderers={{} as CellRendererRegistry}
    />
  );
}

/**
 * The columns AG Grid actually laid out, left to right.
 *
 * Ordered by `aria-colindex`, NOT by DOM position: AG Grid absolutely-positions header
 * cells and appends a newly-added one to the end of the DOM regardless of where it
 * ends up on screen, so document order says nothing about the visual order.
 */
function headerIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.ag-header-cell[col-id]'))
    .sort(
      (a, b) =>
        Number(a.getAttribute('aria-colindex') ?? 0) - Number(b.getAttribute('aria-colindex') ?? 0)
    )
    .map((el) => el.getAttribute('col-id') as string);
}

/**
 * jsdom measures every element as 0x0, and AG Grid then lays out no columns at all —
 * so the header assertions would be vacuously empty. Give it a viewport.
 */
function installLayout(width = 1200, height = 600) {
  for (const [prop, value] of [
    ['offsetWidth', width],
    ['clientWidth', width],
    ['offsetHeight', height],
    ['clientHeight', height],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => value });
  }
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height }) as DOMRect;
}

describe('a contextually-gated column across a context switch', () => {
  beforeAll(() => installLayout());

  it('comes back at its declared slot, not appended after every other column', async () => {
    const { container, rerender } = render(renderGrid(makeController(HIERARCHY)));
    // AG Grid mounts (and lays out its header) a tick after the React render
    await waitFor(() =>
      expect(headerIds(container)).toEqual(['name', GATED, 'description', 'region'])
    );

    // …the user switches to flat: the gate resolves false and the column resolves away
    await act(async () => rerender(renderGrid(makeController(FLAT))));
    expect(headerIds(container)).toEqual(['name', 'description', 'region']);

    // …and back to hierarchy, on the SAME AG Grid instance
    await act(async () => rerender(renderGrid(makeController(HIERARCHY))));
    expect(headerIds(container)).toEqual(['name', GATED, 'description', 'region']);
  });

  it('still honours a user-reordered column layout on a plain refresh', async () => {
    // The store owns the order; without `maintainColumnOrder` every colDefs refresh
    // re-asserts it, so a drag (→ `setColumnOrder`) must survive the next re-render.
    const controller = makeController(HIERARCHY);
    const { container, rerender } = render(renderGrid(controller));
    await waitFor(() => expect(headerIds(container).length).toBe(4));

    await act(async () => {
      controller.store.dispatch({
        type: GridActionType.SetColumnOrder,
        order: ['region', 'name', GATED, 'description'],
      });
      rerender(renderGrid(controller));
    });

    // `region` moved to the front; the PINNED gated column keeps its declared slot
    // (right after `name`) rather than the position the stored order records for it.
    expect(headerIds(container)).toEqual(['region', 'name', GATED, 'description']);
  });
});
