/**
 * The column chooser lists AUXILIARY columns apart, below a hairline SEPARATOR (no
 * label), after the regular ones — they are opt-in fields, not columns the grid is
 * about — and ticking one is an ordinary visibility change (it just also moves that
 * field's filter out of the advanced-filters panel; see `resolveFilterPanelGroups`).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { describe, expect, it } from 'vitest';

import { GridActionType, OperatorId } from '@/features/data-grid/core';
import { GridController } from '@/features/data-grid/core/grid-controller';
import { ColumnChooser } from '@/features/data-grid/react/column-chooser';

import type { IColumnModel, IGridSchema } from '@/features/data-grid/core';

interface Row {
  id: string;
}

const COLUMNS: Array<IColumnModel<Row>> = [
  { id: 'brainRegion', header: 'Brain region' },
  { id: 'species', header: 'Species' },
  {
    id: 'strainName',
    header: 'Strain',
    field: 'subject__strain__name',
    auxiliary: true,
    sortable: false,
    filter: { operators: [OperatorId.Ilike] },
  },
];

const SCHEMA: IGridSchema<Row> = { id: 'test', getRowId: (r) => r.id, columns: COLUMNS };

/**
 * The chooser is a controlled view of the store, so the harness SUBSCRIBES rather
 * than passing a frozen snapshot: a click has to be observable as re-rendered
 * checkboxes, not only as a dispatched action.
 */
function Harness({ controller }: { controller: GridController<Row> }) {
  const state = useSyncExternalStore(
    (fn) => controller.store.subscribe(fn),
    () => controller.store.getSnapshot(),
    () => controller.store.getSnapshot()
  );
  return <ColumnChooser controller={controller} state={state} />;
}

function mount() {
  const controller = new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    defaultPageSize: 20,
  });
  const view = render(<Harness controller={controller} />);
  return { controller, view };
}

describe('column chooser — auxiliary columns', () => {
  it('separates them from the regular ones with a hairline, not a label', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));

    // two hairlines: one under "Select all", one before the auxiliary columns
    const separators = await screen.findAllByRole('separator');
    expect(separators).toHaveLength(2);
    const separator = separators[1];

    // no heading text — the break is purely visual
    expect(screen.queryByText('More columns')).not.toBeInTheDocument();

    // the regular columns are ticked, the auxiliary one is not
    expect(screen.getByRole('checkbox', { name: 'Brain region' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Strain' })).not.toBeChecked();

    // …and the auxiliary checkbox comes AFTER the separator in document order
    expect(
      separator.compareDocumentPosition(screen.getByRole('checkbox', { name: 'Strain' }))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      separator.compareDocumentPosition(screen.getByRole('checkbox', { name: 'Species' }))
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it('ticking one is a plain visibility change', async () => {
    const { controller } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Strain' }));

    expect(controller.store.getSnapshot().hiddenColumns).toEqual([]);
  });
});

/**
 * "Select all" is a TRI-STATE control over the same `hiddenColumns` state the
 * per-column checkboxes write — there is no second source of truth. Unticking it
 * keeps the FIRST column visible (see the empty-grid guard in `column-chooser.tsx`),
 * so the toggle cycles all ⇄ first-only and never produces a columnless grid.
 */
describe('column chooser — select all', () => {
  const selectAll = () => screen.getByRole('checkbox', { name: 'Select all' });

  async function open() {
    const mounted = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    await screen.findByRole('checkbox', { name: 'Select all' });
    return mounted;
  }

  it('is indeterminate while the auxiliary column is hidden', async () => {
    await open();
    // the auxiliary column starts hidden ⇒ mixed
    expect(selectAll()).not.toBeChecked();
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed');
  });

  it('one click reveals every column, including the auxiliary ones', async () => {
    const { controller } = await open();
    fireEvent.click(selectAll());

    expect(controller.store.getSnapshot().hiddenColumns).toEqual([]);
    expect(screen.getByRole('checkbox', { name: 'Strain' })).toBeChecked();
    expect(selectAll()).toBeChecked();
    expect(selectAll()).not.toHaveAttribute('aria-checked', 'mixed');
  });

  it('unticking keeps the first column visible rather than emptying the grid', async () => {
    const { controller } = await open();
    fireEvent.click(selectAll()); // → all visible
    fireEvent.click(selectAll()); // → first only

    expect(controller.store.getSnapshot().hiddenColumns).toEqual(['species', 'strainName']);
    expect(screen.getByRole('checkbox', { name: 'Brain region' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Species' })).not.toBeChecked();
    // one column still visible ⇒ mixed, not unchecked
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed');
  });

  it('reads unchecked only when the per-column checkboxes hid everything', async () => {
    const { controller } = await open();
    act(() => {
      controller.store.dispatch({
        type: GridActionType.SetHiddenColumns,
        hidden: ['brainRegion', 'species', 'strainName'],
      });
    });

    expect(selectAll()).not.toBeChecked();
    expect(selectAll()).not.toHaveAttribute('aria-checked', 'mixed');
  });
});
