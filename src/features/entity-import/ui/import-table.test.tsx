import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ImportInputType } from '../core/contracts';
import { EntityImportFeature } from '../index';

import type { ReactElement } from 'react';
import type { IEntityImportAdapter, TableCellRendererProps } from '../core/adapter';

const inlineCellRenderCounts: Record<string, number> = {};
const htmlElementPrototypeDescriptors = {
  hasPointerCapture: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hasPointerCapture'),
  setPointerCapture: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'setPointerCapture'),
  releasePointerCapture: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'releasePointerCapture'
  ),
  scrollIntoView: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView'),
} as const;

function trackInlineCellRender(rowIndex: number, fieldPath: string) {
  const key = `${rowIndex}:${fieldPath}`;
  inlineCellRenderCounts[key] = (inlineCellRenderCounts[key] ?? 0) + 1;
}

function createCountingCellRenderer(fieldPath: string) {
  return function CountingCellRenderer({ actions, field, row, session }: TableCellRendererProps) {
    trackInlineCellRender(row.rowIndex, fieldPath);

    return (
      <button
        type="button"
        aria-label={`${field.label} row ${row.rowIndex + 1}`}
        className="h-full w-full px-3 py-2 text-left"
        onClick={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
      >
        {session.selectedCell?.rowId === row.id && session.selectedCell?.fieldPath === field.path
          ? `Selected: ${row.cells[field.path].rawValue || '—'}`
          : row.cells[field.path].rawValue || '—'}
      </button>
    );
  };
}

const tableHarnessAdapter: IEntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'import-table-rerender-harness',
  title: 'Import Table Rerender Harness',
  templateFileName: 'import-table-rerender.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
      columnWidth: 200,
      tableRenderer: createCountingCellRenderer('name'),
    },
    {
      label: 'Status',
      path: 'status',
      required: true,
      inputType: ImportInputType.Select,
      columnWidth: 200,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
      tableRenderer: createCountingCellRenderer('status'),
    },
  ],
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
    status: z.string().min(1, 'Status is required'),
  }),
  createBlankRow() {
    return { name: '', status: 'draft' };
  },
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

function getFieldCell(rowNumber: number, label: string): HTMLElement {
  const control = screen.getByLabelText(`${label} row ${rowNumber}`);
  const td = control.closest('td');
  if (!(td instanceof HTMLElement)) {
    throw new Error('Expected table cell for import field');
  }

  return td;
}

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ImportTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(inlineCellRenderCounts)) {
      delete inlineCellRenderCounts[key];
    }

    if (!HTMLElement.prototype.hasPointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
        configurable: true,
        value: vi.fn(() => false),
      });
    }

    if (!HTMLElement.prototype.setPointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
        configurable: true,
        value: vi.fn(),
      });
    }

    if (!HTMLElement.prototype.releasePointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
        configurable: true,
        value: vi.fn(),
      });
    }

    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: vi.fn(),
      });
    }
  });

  afterEach(() => {
    (
      Object.entries(htmlElementPrototypeDescriptors) as Array<
        [keyof typeof htmlElementPrototypeDescriptors, PropertyDescriptor | undefined]
      >
    ).forEach(([propertyName, descriptor]) => {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, propertyName, descriptor);
        return;
      }

      delete (HTMLElement.prototype as Record<string, unknown>)[propertyName];
    });
  });

  it('re-renders only the previously selected and newly selected visible cells when selection changes', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <EntityImportFeature
        title="Import Table Rerender"
        onClose={() => {}}
        adapter={tableHarnessAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', status: 'draft' },
          { name: 'Neuron B', status: 'draft' },
        ]}
      />
    );

    await screen.findByLabelText('Name row 1');

    await user.click(screen.getByLabelText('Name row 1'));
    await waitFor(() => {
      expect(getFieldCell(1, 'Name')).toHaveClass('bg-blue-50/60');
    });

    for (const key of Object.keys(inlineCellRenderCounts)) {
      delete inlineCellRenderCounts[key];
    }

    await user.click(screen.getByLabelText('Name row 2'));

    await waitFor(() => {
      expect(getFieldCell(2, 'Name')).toHaveClass('bg-blue-50/60');
    });

    const rerenderedKeys = Object.entries(inlineCellRenderCounts)
      .filter(([, count]) => count > 0)
      .map(([key]) => key);

    expect(
      rerenderedKeys.sort(),
      'expected only the prior and newly selected field cells to re-render when selection moves between rows'
    ).toEqual(['0:name', '1:name']);
  });
});
