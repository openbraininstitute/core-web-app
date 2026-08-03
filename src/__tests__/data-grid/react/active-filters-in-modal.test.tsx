/**
 * REGRESSION — the grid must work inside a modal.
 *
 * `ui/molecules/modal` portals its dialog to `document.body` at `zIndex + 1` (1001 by
 * default); the toolbar's advanced-filters popover portals to the SAME parent. Two
 * body-level siblings order by z-index alone, so while the popover kept the
 * `ui/molecules/popover` default of `z-50` it opened BEHIND the dialog and the button
 * read as dead (the workflow entity pickers — "Select ion channel recording").
 *
 * Painted stacking cannot be observed in jsdom, so the assertion is on the thing that
 * decides it: the popover's own stacking RANK must exceed the dialog's. The rank is
 * read from whichever channel the element uses — an inline `z-index` (the modal) or a
 * `z-<n>` utility (the popover) — so the test survives a rename of the constant and
 * fails the moment either surface drifts back below the other.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createDefaultOperatorRegistry,
  FilterOptionsKind,
  GridController,
  OperatorId,
} from '@/features/data-grid/core';
import { ActiveFiltersButton } from '@/features/data-grid/react/active-filters';
import { Modal } from '@/ui/molecules/modal';

import type { IGridSchema } from '@/features/data-grid/core';

interface Row {
  id: string;
}

const schema: IGridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  advancedFilters: [
    {
      id: 'filters',
      label: 'Filters',
      filters: [
        {
          id: 'generationType',
          label: 'Generation type',
          field: 'proto__generation_type',
          operators: [OperatorId.Eq],
          options: {
            kind: FilterOptionsKind.Static,
            items: [{ id: 'modified_reconstruction', label: 'Modified reconstruction' }],
          },
        },
      ],
    },
  ],
  columns: [{ id: 'name', header: 'Name' }],
};

/**
 * The z-index an element actually contributes, from either channel: the inline style
 * the modal sets, or the `z-<n>` / `z-[<n>]` utility a Tailwind surface carries (class
 * names have no computed style in jsdom, so they must be read literally).
 */
function stackingRank(el: Element | null): number {
  if (!(el instanceof HTMLElement)) return Number.NaN;
  const inline = Number.parseInt(el.style.zIndex, 10);
  if (Number.isFinite(inline)) return inline;
  for (const token of el.classList) {
    const m = /^z-\[?(\d+)]?$/.exec(token);
    if (m) return Number.parseInt(m[1], 10);
  }
  return Number.NaN;
}

describe('ActiveFiltersButton inside a modal', () => {
  it('opens its popover ABOVE the modal dialog', () => {
    const controller = new GridController<Row>({
      schema,
      context: { dataType: 't' },
      defaultPageSize: 30,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <Modal open title="Select ion channel recording">
          <ActiveFiltersButton
            controller={controller}
            state={controller.store.getSnapshot()}
            operators={createDefaultOperatorRegistry()}
          />
        </Modal>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));

    // the popover is REACHABLE — its content mounted, with the filter list in it
    const content = document.querySelector('[data-slot="popover-content"]');
    expect(content).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: /Generation type/ })).toBeInTheDocument();

    // …and it is not buried under the dialog it was opened from
    const dialog = document.getElementById('modal-dialog');
    expect(dialog).not.toBeNull();
    expect(stackingRank(content)).toBeGreaterThan(stackingRank(dialog));
  });
});
