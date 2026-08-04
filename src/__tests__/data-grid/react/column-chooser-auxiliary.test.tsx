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

function mount(schema: IGridSchema<Row> = SCHEMA) {
  const controller = new GridController<Row>({
    schema,
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
 * per-column checkboxes write — there is no second source of truth.
 *
 * The BULK deselect is conservative: it keeps the schema's ESSENTIAL columns (or, when
 * a schema marks none, the first non-auxiliary one). The INDIVIDUAL checkboxes are
 * unrestricted, so an empty grid stays reachable deliberately but never in one click.
 * The tri-state always reports ACTUAL visibility, which is why a bulk deselect lands
 * on indeterminate rather than unchecked.
 */
describe('column chooser — select all', () => {
  const selectAll = () => screen.getByRole('checkbox', { name: 'Select all' });

  async function open(schema?: IGridSchema<Row>) {
    const mounted = mount(schema);
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

  it('with nothing marked, the bulk deselect falls back to the first non-auxiliary column', async () => {
    const { controller } = await open();
    fireEvent.click(selectAll()); // → all visible
    fireEvent.click(selectAll()); // → essential only

    expect(controller.store.getSnapshot().hiddenColumns).toEqual(['species', 'strainName']);
    expect(screen.getByRole('checkbox', { name: 'Brain region' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Species' })).not.toBeChecked();
    // something is still visible ⇒ mixed, not unchecked
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed');
  });

  it('a schema that marks its own essential columns keeps exactly those', async () => {
    const marked: IGridSchema<Row> = {
      ...SCHEMA,
      columns: [
        { ...COLUMNS[0] },
        { ...COLUMNS[1], essential: true },
        { ...COLUMNS[2], essential: true },
      ],
    };
    const { controller } = await open(marked);
    fireEvent.click(selectAll());
    fireEvent.click(selectAll());

    // the marked set wins over the fallback — even the auxiliary one, if marked
    expect(controller.store.getSnapshot().hiddenColumns).toEqual(['brainRegion']);
    expect(screen.getByRole('checkbox', { name: 'Species' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Strain' })).toBeChecked();
  });

  it('an essential column can still be hidden one at a time, all the way to empty', async () => {
    const { controller } = await open();
    fireEvent.click(selectAll()); // → all visible
    fireEvent.click(selectAll()); // → Brain region only, the fallback essential

    // the guard binds the BULK action only: its own checkbox still hides it
    fireEvent.click(screen.getByRole('checkbox', { name: 'Brain region' }));

    expect(controller.store.getSnapshot().hiddenColumns).toEqual([
      'brainRegion',
      'species',
      'strainName',
    ]);
    expect(selectAll()).not.toBeChecked();
    expect(selectAll()).not.toHaveAttribute('aria-checked', 'mixed');
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
