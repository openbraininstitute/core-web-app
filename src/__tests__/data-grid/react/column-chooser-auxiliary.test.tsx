/**
 * The column chooser lists AUXILIARY columns apart, under "More columns", below the
 * regular ones — they are opt-in fields, not columns the grid is about — and ticking
 * one is an ordinary visibility change (it just also moves that field's filter out of
 * the advanced-filters panel; see `resolveFilterPanelGroups`).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OperatorId } from '@/features/data-grid/core';
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

function mount() {
  const controller = new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    defaultPageSize: 20,
  });
  const view = render(
    <ColumnChooser controller={controller} state={controller.store.getSnapshot()} />
  );
  return { controller, view };
}

describe('column chooser — auxiliary columns', () => {
  it('groups them under a "More columns" heading, after the regular ones', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));

    const heading = await screen.findByText('More columns');

    // the regular columns are ticked, the auxiliary one is not
    expect(screen.getByRole('checkbox', { name: 'Brain region' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Strain' })).not.toBeChecked();

    // …and the auxiliary checkbox comes AFTER the heading in document order
    expect(heading.compareDocumentPosition(screen.getByRole('checkbox', { name: 'Strain' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(heading.compareDocumentPosition(screen.getByRole('checkbox', { name: 'Species' }))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING
    );
  });

  it('ticking one is a plain visibility change', async () => {
    const { controller } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Strain' }));

    expect(controller.store.getSnapshot().hiddenColumns).toEqual([]);
  });
});
