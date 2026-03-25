import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ImportInputType } from '../core/contracts';
import { EntityImportFeature } from '../index';

import type { ReactElement } from 'react';
import type { EntityImportAdapter } from '../core/adapter';

const adapter: EntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'mock-import',
  title: 'Mock Entity Import',
  templateFileName: 'mock-import.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
    },
    {
      label: 'Brain Region',
      path: 'brainRegion',
      required: true,
      inputType: ImportInputType.RemoteSelect,
      remote: {
        async search({ query }) {
          if (!query.toLowerCase().includes('ctx') && !query.toLowerCase().includes('isocortex')) {
            return [];
          }

          return [
            {
              value: 'brain-region-1',
              label: 'Isocortex',
              recommended: true,
            },
          ];
        },
      },
    },
  ],
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
    brainRegion: z.literal('brain-region-1'),
  }),
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

const textApplyAdapter: EntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'text-apply-import',
  title: 'Text Apply Import',
  templateFileName: 'text-apply.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
    },
  ],
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
  }),
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

const dateDisplayAdapter: EntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'date-display-import',
  title: 'Date Display Import',
  templateFileName: 'date-display.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Experiment Date',
      path: 'experimentDate',
      required: false,
      inputType: ImportInputType.Date,
    },
  ],
  schema: z.object({
    experimentDate: z.string(),
  }),
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('EntityImportFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps add row in the table footer while using a scrollable table body', () => {
    const { container } = renderWithQueryClient(
      <EntityImportFeature
        adapter={adapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={Array.from({ length: 8 }, (_, index) => ({
          name: `Neuron ${index + 1}`,
          brainRegion: `Region ${index + 1}`,
        }))}
      />
    );

    expect(container.querySelector('.ant-table-body')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add row' }).closest('.ant-table-footer')
    ).not.toBeNull();
  });

  it('positions the header resize handle on the column divider', () => {
    renderWithQueryClient(
      <EntityImportFeature
        adapter={adapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ name: 'Neuron 1', brainRegion: 'Region 1' }]}
      />
    );

    expect(screen.getByRole('button', { name: 'Resize Name column' })).toHaveClass(
      'translate-x-1/2'
    );
  });

  it('auto-resolves exact remote labels and submits the hidden id', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        adapter={adapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ name: 'Neuron A', brainRegion: '' }]}
      />
    );

    await user.click(screen.getByLabelText('Brain Region row 1'));

    const validatorInput = screen.getByLabelText('Validator value');
    await user.clear(validatorInput);
    await user.type(validatorInput, 'isocortex');

    await waitFor(() => {
      expect(screen.getByLabelText('Brain Region row 1')).toHaveValue('Isocortex');
    });

    const submitButton = screen.getByRole('button', { name: /Import rows 1 row\(s\)/i });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(adapter.submitRow).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            name: 'Neuron A',
            brainRegion: 'brain-region-1',
          },
        })
      );
    });
  });

  it('scrolls the table body to the new row when adding a row', async () => {
    const user = userEvent.setup();
    const { container } = renderWithQueryClient(
      <EntityImportFeature
        adapter={adapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={Array.from({ length: 8 }, (_, index) => ({
          name: `Neuron ${index + 1}`,
          brainRegion: `Region ${index + 1}`,
        }))}
      />
    );

    const tableBody = container.querySelector('.ant-table-body') as HTMLDivElement | null;
    expect(tableBody).toBeInTheDocument();
    if (!tableBody) {
      throw new Error('Expected AntD table body to exist');
    }

    Object.defineProperty(tableBody, 'scrollHeight', {
      configurable: true,
      value: 640,
    });
    tableBody.scrollTop = 0;

    await user.click(screen.getByRole('button', { name: 'Add row' }));

    await waitFor(() => {
      const nextTableBody = container.querySelector('.ant-table-body') as HTMLDivElement | null;
      expect(nextTableBody?.scrollTop).toBe(640);
    });
    expect(screen.getByLabelText('Name row 9')).toBeInTheDocument();
  });

  it('stages a selected remote suggestion and applies it after accepting the draft', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        adapter={adapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', brainRegion: 'Ctx' },
          { name: 'Neuron B', brainRegion: 'Ctx' },
        ]}
      />
    );

    await user.click(screen.getByLabelText('Brain Region row 1'));

    expect(screen.getByText('Validator')).toBeInTheDocument();

    const validatorInput = screen.getByLabelText('Validator value');
    await user.clear(validatorInput);
    await user.type(validatorInput, 'Ctx');

    const suggestion = await screen.findByText('Isocortex');
    await waitFor(() => {
      expect(suggestion).toBeInTheDocument();
    });

    await user.click(suggestion);
    await user.click(screen.getByRole('button', { name: /Apply to all/i }));

    expect(
      screen.getByRole('button', { name: 'Accept suggested Brain Region row 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Accept suggested Brain Region row 2' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept suggested Brain Region row 1' }));
    await user.click(screen.getByRole('button', { name: 'Accept suggested Brain Region row 2' }));

    expect(screen.getByLabelText('Brain Region row 1')).toHaveValue('Isocortex');
    expect(screen.getByLabelText('Brain Region row 2')).toHaveValue('Isocortex');
  });

  it('applies manual validator text edits to all rows', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        adapter={textApplyAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ name: 'Neuron A' }, { name: 'Neuron B' }]}
      />
    );

    await user.click(screen.getByLabelText('Name row 1'));

    const validatorInput = screen.getByLabelText('Validator value');
    await user.clear(validatorInput);
    await user.type(validatorInput, 'Neuron Z');

    expect(screen.getByLabelText('Name row 1')).toHaveValue('Neuron A');

    await user.click(screen.getByRole('button', { name: /Apply to all/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name row 1')).toHaveValue('Neuron Z');
      expect(screen.getByLabelText('Name row 2')).toHaveValue('Neuron Z');
    });
  });

  it('shows formatted date values in the validator summary header', async () => {
    const user = userEvent.setup();
    const isoDate = '2026-03-16T23:00:00.000Z';
    const expectedDisplay = dayjs(isoDate).format('DD/MM/YYYY');

    renderWithQueryClient(
      <EntityImportFeature
        adapter={dateDisplayAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ experimentDate: isoDate }]}
      />
    );

    await user.click(screen.getByLabelText('Experiment Date row 1'));

    expect(screen.getByText(expectedDisplay)).toBeInTheDocument();
    expect(screen.queryByText(/2026-03-16T23:00:00/)).not.toBeInTheDocument();
  });
});
