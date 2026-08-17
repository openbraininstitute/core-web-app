import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GridController } from '@/features/data-grid/core/grid-controller';
import { createDefaultOperatorRegistry } from '@/features/data-grid/core/operators/default-operators';
import { CellRendererRegistry } from '@/features/data-grid/react';
import { AgHeader } from '@/features/data-grid/renderers/aggrid/header';

import type { CustomHeaderProps } from 'ag-grid-react';
import type { IGridSchema } from '@/features/data-grid/core';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

interface Row {
  id: string;
}

const SCHEMA: IGridSchema<Row> = {
  id: 'test',
  getRowId: (r) => r.id,
  columns: [{ id: 'score', header: 'Model cumulated score', sortable: true }],
};

function renderHeader(displayName = 'Model cumulated score') {
  const controller = new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    defaultPageSize: 20,
  });
  const context: IAgGridContext = {
    controller,
    operators: createDefaultOperatorRegistry(),
    cellRenderers: new CellRendererRegistry(),
  } as unknown as IAgGridContext;

  render(
    <AgHeader
      {...({
        displayName,
        context,
        columnId: 'score',
        sortable: true,
      } as unknown as CustomHeaderProps)}
    />
  );
  return screen.getByTitle(displayName);
}

describe('column header — long names', () => {
  it('clamps to two lines rather than one, and carries the full name as a title', () => {
    const label = renderHeader();

    expect(label).toHaveTextContent('Model cumulated score');
    expect(label.className).toContain('line-clamp-2');
    expect(label.className).toContain('whitespace-normal');
    expect(label.className).not.toContain('truncate');
  });
});
