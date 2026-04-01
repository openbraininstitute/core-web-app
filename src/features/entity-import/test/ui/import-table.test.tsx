import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { EntityImportFeature } from '@/features/entity-import';
import { ImportInputType } from '@/features/entity-import/core/contracts';

import type { ReactElement } from 'react';
import type { IEntityImportAdapter } from '@/features/entity-import/core/adapter';

const standardInputRenderHarness = vi.hoisted(() => {
  const counts: Record<string, number> = {};
  const trackedLabelPattern = /^(Name|Notes) row \d+$/;

  return {
    counts,
    reset() {
      for (const key of Object.keys(counts)) {
        delete counts[key];
      }
    },
    track(label: unknown) {
      if (typeof label !== 'string' || !trackedLabelPattern.test(label)) {
        return;
      }

      counts[label] = (counts[label] ?? 0) + 1;
    },
    renderedLabels() {
      return Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([label]) => label)
        .sort();
    },
  };
});

vi.mock('@/ui/molecules/input', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/ui/molecules/input')>();

  return {
    ...actual,
    Input: ({ 'aria-label': ariaLabel, ...props }: any) => {
      standardInputRenderHarness.track(ariaLabel);

      return (
        <input aria-label={typeof ariaLabel === 'string' ? ariaLabel : undefined} {...props} />
      );
    },
  };
});

const htmlElementPrototypeDescriptors = {
  hasPointerCapture: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hasPointerCapture'),
  setPointerCapture: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'setPointerCapture'),
  releasePointerCapture: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'releasePointerCapture'
  ),
  scrollIntoView: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView'),
} as const;

const tableHarnessAdapter: IEntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'import-table-standard-rerender-harness',
  title: 'Import Table Standard Rerender Harness',
  templateFileName: 'import-table-standard-rerender.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
      columnWidth: 200,
    },
    {
      label: 'Notes',
      path: 'notes',
      required: true,
      inputType: ImportInputType.Text,
      columnWidth: 200,
    },
  ],
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
    notes: z.string().min(1, 'Notes are required'),
  }),
  createBlankRow() {
    return { name: '', notes: '' };
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
    standardInputRenderHarness.reset();

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
          { name: 'Neuron A', notes: 'Alpha' },
          { name: 'Neuron B', notes: 'Beta' },
        ]}
      />
    );

    await screen.findByLabelText('Name row 1');

    await user.click(screen.getByLabelText('Name row 1'));
    await waitFor(() => {
      expect(getFieldCell(1, 'Name')).toHaveClass('bg-blue-50/60');
    });

    standardInputRenderHarness.reset();

    await user.click(screen.getByLabelText('Name row 2'));

    await waitFor(() => {
      expect(getFieldCell(2, 'Name')).toHaveClass('bg-blue-50/60');
    });

    expect(
      standardInputRenderHarness.renderedLabels(),
      'expected only the prior and newly selected field cells to re-render when selection moves between rows'
    ).toEqual(['Name row 1', 'Name row 2']);
  });

  it('does not re-render unrelated visible text cells when editing one standard field', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <EntityImportFeature
        title="Import Table Standard Edit Rerender"
        onClose={() => {}}
        adapter={tableHarnessAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', notes: 'Alpha' },
          { name: 'Neuron B', notes: 'Beta' },
        ]}
      />
    );

    const nameRowOne = await screen.findByLabelText('Name row 1');

    await user.click(nameRowOne);
    await waitFor(() => {
      expect(getFieldCell(1, 'Name')).toHaveClass('bg-blue-50/60');
    });

    standardInputRenderHarness.reset();

    await user.clear(nameRowOne);
    await user.type(nameRowOne, 'Neuron A updated');
    fireEvent.blur(nameRowOne);

    await waitFor(() => {
      expect(screen.getByLabelText('Name row 1')).toHaveValue('Neuron A updated');
    });

    expect(
      standardInputRenderHarness.renderedLabels(),
      'expected only the edited text cell to re-render while unrelated visible text cells keep their previous render output'
    ).toEqual(['Name row 1']);
  });
});
