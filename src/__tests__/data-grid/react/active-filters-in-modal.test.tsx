/**
 * Regression: the advanced-filters popover opened behind the modal dialog it was
 * launched from (both portal to `document.body`, so z-index alone orders them) and the
 * button read as dead. jsdom cannot observe painted stacking, so the assertion is on the
 * stacking rank each surface contributes.
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
 * The z-index an element contributes, from either channel: the modal's inline style, or a
 * `z-<n>` utility read literally (class names have no computed style in jsdom).
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

    const content = document.querySelector('[data-slot="popover-content"]');
    expect(content).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: /Generation type/ })).toBeInTheDocument();

    const dialog = document.getElementById('modal-dialog');
    expect(dialog).not.toBeNull();
    expect(stackingRank(content)).toBeGreaterThan(stackingRank(dialog));
  });
});
