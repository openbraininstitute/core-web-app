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

  it('keeps the applied pane (and so the popover width) when nothing is applied', () => {
    openPopover(oneGroup, false);
    expect(screen.getByText('Applied Filters')).toBeInTheDocument();
    expect(screen.getByText('No filters applied yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset all filters/ })).toBeNull();
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
