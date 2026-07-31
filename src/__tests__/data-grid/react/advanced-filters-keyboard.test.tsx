import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultOperatorRegistry,
  FilterOptionsKind,
  GridController,
  OperatorId,
} from '@/features/data-grid/core';
import { AdvancedFiltersMenu } from '@/features/data-grid/react/advanced-filters';

import type { IAdvancedFilterGroup, IGridSchema } from '@/features/data-grid/core';

interface Row {
  id: string;
}

const groups: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol',
    label: 'Protocol',
    filters: [
      // free text → a single <input> value box
      { id: 'doc', label: 'Document', field: 'proto__doc', operators: [OperatorId.Ilike] },
      // set WITH options → search box + option checkboxes
      {
        id: 'design',
        label: 'Design',
        field: 'proto__design',
        operators: [OperatorId.In],
        options: {
          kind: FilterOptionsKind.Static,
          items: [{ id: 'patch', label: 'Patch clamp' }],
        },
      },
      // set WITHOUT options → the free-entry <textarea>
      { id: 'ids', label: 'Ids', field: 'proto__id', operators: [OperatorId.In] },
    ],
  },
];

const schema: IGridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  advancedFilters: groups,
  columns: [
    { id: 'name', header: 'Name', filter: { operators: [OperatorId.Ilike], field: 'name' } },
  ],
};

/**
 * Renders the menu, opens one filter's submenu, and exposes a spy on the keydown
 * events that make it PAST the submenu — i.e. the ones the surrounding popover
 * would see and close itself on.
 */
function openFilter(name: string) {
  const controller = new GridController<Row>({
    schema,
    context: { dataType: 't' },
    defaultPageSize: 30,
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const escaped = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stands in for the popover */}
      <div onKeyDown={escaped}>
        <AdvancedFiltersMenu
          controller={controller}
          state={controller.store.getSnapshot()}
          operators={createDefaultOperatorRegistry()}
          onClose={() => {}}
        />
      </div>
    </QueryClientProvider>
  );
  fireEvent.click(utils.getByRole('menuitem', { name: new RegExp(name) }));
  // the submenu replaced the list — no menu rows are mounted while it is open
  expect(utils.queryByRole('menuitem')).toBeNull();
  return { ...utils, escaped };
}

describe('AdvancedFiltersMenu — ArrowLeft/Escape in the filter submenu', () => {
  it('ArrowLeft inside the value input does NOT navigate back, and keeps the draft', () => {
    const { getByRole, queryByRole, escaped } = openFilter('Document');
    const input = getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });

    fireEvent.keyDown(input, { key: 'ArrowLeft' });

    // still in the submenu, draft intact
    expect(queryByRole('menuitem')).toBeNull();
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('abc');
    // and the key was left alone rather than swallowed
    expect(escaped).toHaveBeenCalledTimes(1);
  });

  it('ArrowLeft inside the free-entry textarea does NOT navigate back', () => {
    const { getByRole, queryByRole } = openFilter('Ids');
    fireEvent.keyDown(getByRole('textbox'), { key: 'ArrowLeft' });
    expect(queryByRole('menuitem')).toBeNull();
    expect(getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it("ArrowLeft inside a set filter's search box does NOT navigate back", () => {
    const { getByPlaceholderText, queryByRole } = openFilter('Design');
    fireEvent.keyDown(getByPlaceholderText('Search…'), { key: 'ArrowLeft' });
    expect(queryByRole('menuitem')).toBeNull();
  });

  it('ArrowLeft from a menu row (the back title) still navigates back', () => {
    const { getByRole, queryByRole, escaped } = openFilter('Document');

    fireEvent.keyDown(getByRole('button', { name: /back to Protocol/ }), { key: 'ArrowLeft' });

    // back on the group's filter list
    expect(getByRole('menuitem', { name: /Document/ })).toBeTruthy();
    expect(queryByRole('textbox')).toBeNull();
    // consumed here, so the popover behind never sees it
    expect(escaped).not.toHaveBeenCalled();
  });

  it('ArrowLeft from a checkbox still navigates back — no caret to move there', () => {
    const { getByRole, queryByRole } = openFilter('Design');
    fireEvent.keyDown(getByRole('checkbox', { name: /Patch clamp/ }), { key: 'ArrowLeft' });
    expect(queryByRole('menuitem', { name: /Design/ })).toBeTruthy();
  });

  it('Escape backs out from ANYWHERE, including inside the value input, and stops there', () => {
    const { getByRole, queryByRole, escaped } = openFilter('Document');

    fireEvent.keyDown(getByRole('textbox'), { key: 'Escape' });

    expect(getByRole('menuitem', { name: /Document/ })).toBeTruthy();
    expect(queryByRole('textbox')).toBeNull();
    // one layer per press: the surrounding popover must not close too
    expect(escaped).not.toHaveBeenCalled();
  });
});
