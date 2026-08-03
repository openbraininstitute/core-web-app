import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createDefaultOperatorRegistry,
  FilterOptionsKind,
  FilterValueKind,
  GridActionType,
  GridController,
  OperatorId,
} from '@/features/data-grid/core';
import { ActiveFiltersButton } from '@/features/data-grid/react/active-filters';

import type { IAdvancedFilterGroup, IGridSchema } from '@/features/data-grid/core';

interface Row {
  id: string;
}

const oneGroup: ReadonlyArray<IAdvancedFilterGroup> = [
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
      { id: 'doc', label: 'Document', field: 'proto__doc', operators: [OperatorId.Ilike] },
    ],
  },
];

const twoGroups: ReadonlyArray<IAdvancedFilterGroup> = [
  { ...oneGroup[0], id: 'protocol', label: 'Protocol' },
  {
    id: 'record',
    label: 'Record',
    filters: [{ id: 'name', label: 'Name', field: 'name', operators: [OperatorId.Ilike] }],
  },
];

function makeSchema(advancedFilters: ReadonlyArray<IAdvancedFilterGroup>): IGridSchema<Row> {
  return {
    id: 't',
    getRowId: (r) => r.id,
    advancedFilters,
    columns: [
      { id: 'name', header: 'Name', filter: { operators: [OperatorId.Ilike], field: 'name' } },
    ],
  };
}

function openPopover(advancedFilters: ReadonlyArray<IAdvancedFilterGroup>, applied = false) {
  const controller = new GridController<Row>({
    schema: makeSchema(advancedFilters),
    context: { dataType: 't' },
    defaultPageSize: 30,
  });
  if (applied) {
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: 'name',
      entry: {
        columnId: 'name',
        operator: OperatorId.Ilike,
        value: { kind: FilterValueKind.Text, text: 'alpha' },
      },
    });
  }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Harness = () => (
    <QueryClientProvider client={qc}>
      <ActiveFiltersButton
        controller={controller}
        state={controller.store.getSnapshot()}
        operators={createDefaultOperatorRegistry()}
      />
    </QueryClientProvider>
  );
  const utils = render(<Harness />);
  fireEvent.click(utils.getByRole('button', { name: 'Advanced filters' }));
  return { ...utils, controller };
}

describe('ActiveFiltersButton — two-pane popover', () => {
  it('shows the filter list AND the applied pane side by side', () => {
    openPopover(oneGroup, true);
    // left pane: the filter list
    expect(screen.getByRole('menuitem', { name: /Generation type/ })).toBeInTheDocument();
    // right pane: the applied section, its own clear and the global reset
    expect(screen.getByText('Applied Filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Name filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset all filters/ })).toBeInTheDocument();
  });

  it('puts the applied list in a RIGHT pane — a sibling after the filter list, not inside it', () => {
    openPopover(oneGroup, true);
    const listPane = screen.getByTestId('advanced-filters-pane');
    const appliedPane = screen.getByTestId('applied-filters-pane');

    // two panes, side by side: neither contains the other
    expect(listPane.contains(appliedPane)).toBe(false);
    expect(appliedPane.contains(listPane)).toBe(false);
    expect(appliedPane.parentElement).toBe(listPane.parentElement);

    // the applied pane is the SECOND one, and the row is not reversed — so it paints
    // on the right, behind the hairline divider on its leading edge
    expect(listPane.nextElementSibling).toBe(appliedPane);
    const row = appliedPane.parentElement;
    expect(row?.className).not.toContain('flex-row-reverse');
    expect(appliedPane.className).toContain('border-l');

    // the applied list scrolls on its own rather than stretching the popover
    const scroller = screen.getByText('Applied Filters').parentElement?.querySelector('.max-h-72');
    expect(scroller?.className).toContain('overflow-y-auto');

    // and both panes' content really is where it should be
    expect(listPane).toContainElement(screen.getByRole('menuitem', { name: /Generation type/ }));
    expect(appliedPane).toContainElement(screen.getByRole('button', { name: 'Clear Name filter' }));
    expect(appliedPane).toContainElement(screen.getByRole('button', { name: /Reset all filters/ }));
  });

  it('drops the applied pane entirely when nothing is applied', () => {
    openPopover(oneGroup, false);
    // the filter list is still there; the second column is not
    expect(screen.getByTestId('advanced-filters-pane')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Generation type/ })).toBeInTheDocument();
    expect(screen.queryByTestId('applied-filters-pane')).toBeNull();
    expect(screen.queryByText('Applied Filters')).toBeNull();
    expect(screen.queryByRole('button', { name: /Reset all filters/ })).toBeNull();
  });

  it('narrows to one pane with none applied, widens with one — never snapping', () => {
    const single = openPopover(oneGroup, false);
    const narrow = document.querySelector('[data-slot="popover-content"]')?.className ?? '';
    expect(narrow).toContain('w-80');
    // the width change is animated, so the filter list glides rather than teleports
    // when the second pane arrives and pushes the panel open to the left
    expect(narrow).toContain('transition-[width]');
    // and the widened panel still has to fit the viewport
    expect(narrow).toContain('max-w-[calc(100vw-1.5rem)]');
    single.unmount();

    openPopover(oneGroup, true);
    const wide = document.querySelector('[data-slot="popover-content"]')?.className ?? '';
    expect(wide).toContain('w-2xl');
    expect(wide).toContain('max-w-[calc(100vw-1.5rem)]');
  });

  it('renders NO group tabs when the schema resolves to a single group', () => {
    openPopover(oneGroup, false);
    expect(screen.queryByRole('menubar')).toBeNull();
  });

  it('still renders group tabs when a schema declares several groups', () => {
    openPopover(twoGroups, false);
    const menubar = screen.getByRole('menubar', { name: 'Filter groups' });
    expect(menubar).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Record' })).toBeInTheDocument();
  });

  it('keeps the editor and its Reset/Apply in the LEFT pane, applied list untouched', () => {
    openPopover(oneGroup, true);
    fireEvent.click(screen.getByRole('menuitem', { name: /Generation type/ }));
    // the back-chevron title control still opens the editor pane
    expect(screen.getByRole('button', { name: /back to Filters/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    // the right pane is unaffected by what the left one is doing
    expect(screen.getByRole('button', { name: 'Clear Name filter' })).toBeInTheDocument();
  });
});
