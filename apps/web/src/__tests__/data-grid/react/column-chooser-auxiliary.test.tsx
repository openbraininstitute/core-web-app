/**
 * Pins how the column chooser presents auxiliary columns: below a hairline separator,
 * after the regular ones, and ticking one is an ordinary visibility change.
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
 * The chooser is a controlled view of the store, so the harness subscribes rather than
 * passing a frozen snapshot — a click must be observable as re-rendered checkboxes.
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

    expect(screen.queryByText('More columns')).not.toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'Brain region' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Strain' })).not.toBeChecked();

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
 * "Select all" is a tri-state control over the same `hiddenColumns` state the per-column
 * checkboxes write; its bulk deselect keeps the essential columns, so it reports
 * indeterminate rather than unchecked.
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

    expect(controller.store.getSnapshot().hiddenColumns).toEqual(['brainRegion']);
    expect(screen.getByRole('checkbox', { name: 'Species' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Strain' })).toBeChecked();
  });

  it('an essential column can still be hidden one at a time, all the way to empty', async () => {
    const { controller } = await open();
    fireEvent.click(selectAll()); // → all visible
    fireEvent.click(selectAll()); // → Brain region only, the fallback essential

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

describe('column chooser — reset to default', () => {
  async function open() {
    const mounted = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    await screen.findByRole('checkbox', { name: 'Select all' });
    return mounted;
  }

  const resetButton = () => screen.getByRole('button', { name: 'Reset to default' });

  it('is disabled while the layout is already the schema default', async () => {
    await open();
    expect(resetButton()).toBeDisabled();
  });

  it('restores the default visibility after the user changed it', async () => {
    const { controller } = await open();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Species' })); // hide a regular one
    fireEvent.click(screen.getByRole('checkbox', { name: 'Strain' })); // reveal the auxiliary one
    expect(controller.store.getSnapshot().hiddenColumns).toEqual(['species']);
    expect(resetButton()).toBeEnabled();

    fireEvent.click(resetButton());

    expect(controller.store.getSnapshot().hiddenColumns).toEqual(['strainName']);
    expect(screen.getByRole('checkbox', { name: 'Species' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Strain' })).not.toBeChecked();
    expect(resetButton()).toBeDisabled();
  });

  it('stays enabled for an order or width change the checkboxes cannot show', async () => {
    const { controller } = await open();

    act(() => {
      controller.store.dispatch({
        type: GridActionType.SetColumnOrder,
        order: ['species', 'brainRegion', 'strainName'],
      });
    });
    expect(resetButton()).toBeEnabled();

    fireEvent.click(resetButton());
    expect(controller.store.getSnapshot().columnOrder).toEqual([
      'brainRegion',
      'species',
      'strainName',
    ]);

    act(() => {
      controller.store.dispatch({
        type: GridActionType.SetColumnWidth,
        columnId: 'species',
        width: 300,
      });
    });
    expect(resetButton()).toBeEnabled();

    fireEvent.click(resetButton());
    expect(controller.store.getSnapshot().columnWidths).toEqual({});
    expect(resetButton()).toBeDisabled();
  });
});
