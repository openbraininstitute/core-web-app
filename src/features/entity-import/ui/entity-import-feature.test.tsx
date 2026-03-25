import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { CellMorphologyGenerationType } from '@/api/entitycore/types/entities/cell-morphology-protocol';

import { ImportInputType } from '../core/contracts';
import { createCellMorphologyImportAdapter, EntityImportFeature } from '../index';

import type { ReactElement } from 'react';
import type { ICellMorphologyImportServices } from '../adapters/cell-morphology/services';
import type { EntityImportAdapter, RemoteValidationResult } from '../core/adapter';

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

const fileAdapter = {
  id: 'file-import',
  title: 'File Import',
  templateFileName: 'cell-morphology-import-template.csv',
  templateGuide: {
    entityType: 'cell-morphology',
    guideFileName: 'cell-morphology-import-template.md',
  },
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Asset',
      path: 'asset',
      required: true,
      inputType: ImportInputType.FileBundle,
      fileConfig: {
        accept: ['application/json'],
        allowedExtensions: ['.json'],
        maxFiles: 2,
        maxSizeBytes: 5,
      },
    },
  ],
  schema: z.object({
    asset: z.any(),
  }),
  buildPayload({ values }: { values: Record<string, unknown> }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }: { row: { id: string } }) => ({ id: row.id })),
} as unknown as EntityImportAdapter<Record<string, unknown>, { id: string }>;

const validatorMultiColumnAdapter: EntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'validator-multi-column-import',
  title: 'Validator Multi Column Import',
  templateFileName: 'validator-multi-column.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
      columnWidth: 220,
    },
    {
      label: 'Status',
      path: 'status',
      required: true,
      inputType: ImportInputType.Select,
      columnWidth: 220,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
    },
    {
      label: 'Notes',
      path: 'notes',
      required: false,
      inputType: ImportInputType.Text,
      columnWidth: 320,
    },
  ],
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
    status: z.string().min(1, 'Status is required'),
    notes: z.string(),
  }),
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

const rowActionsAdapter: EntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'row-actions-import',
  title: 'Row Actions Import',
  templateFileName: 'row-actions.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
    },
    {
      label: 'Status',
      path: 'status',
      required: true,
      inputType: ImportInputType.Select,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
    },
    {
      label: 'Notes',
      path: 'notes',
      required: false,
      inputType: ImportInputType.Text,
    },
  ],
  schema: z.object({
    name: z.string(),
    status: z.string(),
    notes: z.string(),
  }),
  createBlankRow() {
    return {
      name: '',
      status: 'draft',
      notes: '',
    };
  },
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

function createCsvRemoteValidationAdapter(
  validate: (args: { query: string }) => Promise<RemoteValidationResult>
): EntityImportAdapter<Record<string, string>, { id: string }> {
  return {
    id: 'csv-remote-validation-import',
    title: 'CSV Remote Validation Import',
    templateFileName: 'csv-remote-validation.csv',
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
          validate: ({ query }) => validate({ query }),
        },
      },
    ],
    schema: z.object({
      name: z.string().min(1, 'Name is required'),
      brainRegion: z.string().min(1, 'Brain Region is required'),
    }),
    buildPayload({ values }) {
      return values;
    },
    submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
  };
}

function getCsvUploadInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[accept=".csv,text/csv"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected CSV upload input');
  }

  return input;
}

function createCsvUploadFile(contents: string): File {
  return new File([contents], 'entity-import.csv', {
    type: 'text/csv',
  });
}

function getOpenSelectContent(): HTMLElement {
  const content = document.querySelector('[data-slot="select-content"]');
  if (!(content instanceof HTMLElement)) {
    throw new Error('Expected an open select content');
  }

  return content;
}

function createMockCellMorphologyImportServices(
  overrides: Partial<ICellMorphologyImportServices> = {}
): ICellMorphologyImportServices {
  return {
    searchBrainRegions: vi.fn(async () => []),
    searchBrainRegionsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchLicenses: vi.fn(async () => []),
    searchLicensesPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchSubjects: vi.fn(async () => []),
    searchSubjectsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchProtocols: vi.fn(async () => []),
    searchProtocolsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchMtypes: vi.fn(async () => []),
    searchMtypesPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchPersons: vi.fn(async () => []),
    searchPersonsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchOrganizations: vi.fn(async () => []),
    searchOrganizationsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchConsortia: vi.fn(async () => []),
    searchConsortiaPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    searchRoles: vi.fn(async () => []),
    searchRolesPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    registerMorphology: vi.fn(async () => ({ id: 'morphology-1', isValid: true })),
    createContribution: vi.fn(async () => ({ id: 'contribution-1' })),
    createMtypeClassification: vi.fn(async () => ({ id: 'classification-1' })),
    ...overrides,
  };
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

describe('EntityImportFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

  it('shows row actions in a dropdown and clears the row back to adapter defaults', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        adapter={rowActionsAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', status: 'published', notes: 'Alpha' },
          { name: 'Neuron B', status: 'published', notes: 'Beta' },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Actions row 2' }));
    await user.click(screen.getByRole('menuitem', { name: 'Clear row 2' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name row 2')).toHaveValue('');
      expect(screen.getByLabelText('Status row 2')).toHaveTextContent('Draft');
      expect(screen.getByLabelText('Notes row 2')).toHaveValue('');
    });
    expect(screen.getByLabelText('Name row 1')).toHaveValue('Neuron A');
  });

  it('deletes a row from the row actions dropdown and reindexes the table', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        adapter={rowActionsAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', status: 'published', notes: 'Alpha' },
          { name: 'Neuron B', status: 'draft', notes: 'Beta' },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Actions row 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete row 1' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name row 1')).toHaveValue('Neuron B');
    });
    expect(screen.queryByLabelText('Name row 2')).not.toBeInTheDocument();
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

  it('auto-resolves a single remotely validated csv value immediately after upload', async () => {
    const user = userEvent.setup();
    const validateSpy = vi.fn(async ({ query }: { query: string }) => {
      if (query === 'Cerebellu') {
        return {
          status: 'valid',
          resolvedSuggestion: {
            value: 'brain-region-cerebellum',
            label: 'Cerebellum',
          },
        } as const;
      }

      return {
        status: 'invalid',
        suggestions: [],
      } as const;
    });
    const csvAdapter = createCsvRemoteValidationAdapter(validateSpy);
    const { container } = renderWithQueryClient(
      <EntityImportFeature
        adapter={csvAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
      />
    );

    await user.upload(
      getCsvUploadInput(container),
      createCsvUploadFile('Name,Brain Region\nNeuron A,Cerebellu\n')
    );

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'Cerebellu' }));
      expect(screen.getByLabelText('Brain Region row 1')).toHaveValue('Cerebellum');
    });

    const submitButton = screen.getByRole('button', { name: /Import rows 1 row\(s\)/i });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(csvAdapter.submitRow).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            name: 'Neuron A',
            brainRegion: 'brain-region-cerebellum',
          },
        })
      );
    });
  });

  it('marks imported remote csv values invalid when validation finds no matches', async () => {
    const user = userEvent.setup();
    const validateSpy = vi.fn(async ({ query }: { query: string }) => {
      if (query === 'Atlantis') {
        return {
          status: 'invalid',
          suggestions: [],
          message: 'No matches found for Brain Region.',
        } as const;
      }

      return {
        status: 'invalid',
        suggestions: [],
      } as const;
    });
    const csvAdapter = createCsvRemoteValidationAdapter(validateSpy);
    const { container } = renderWithQueryClient(
      <EntityImportFeature
        adapter={csvAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
      />
    );

    await user.upload(
      getCsvUploadInput(container),
      createCsvUploadFile('Name,Brain Region\nNeuron A,Atlantis\n')
    );

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'Atlantis' }));
      expect(screen.getByLabelText('Brain Region row 1')).toHaveValue('Atlantis');
    });

    await user.click(screen.getByLabelText('Brain Region row 1'));

    expect(await screen.findByText('No matches found for Brain Region.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import rows 1 row\(s\)/i })).toBeDisabled();
  });

  it('re-runs validation for ambiguous imported csv values when the cell is selected', async () => {
    const user = userEvent.setup();
    const validateSpy = vi.fn(async ({ query }: { query: string }) => {
      if (query === 'Cortex') {
        return {
          status: 'invalid',
          message: 'Multiple matches found for Brain Region. Choose one in the validator.',
          suggestions: [
            {
              value: 'brain-region-cortex-layer-2',
              label: 'Cortex layer 2',
            },
            {
              value: 'brain-region-cortex-layer-5',
              label: 'Cortex layer 5',
            },
          ],
        } as const;
      }

      return {
        status: 'invalid',
        suggestions: [],
      } as const;
    });
    const csvAdapter = createCsvRemoteValidationAdapter(validateSpy);
    const { container } = renderWithQueryClient(
      <EntityImportFeature
        adapter={csvAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
      />
    );

    await user.upload(
      getCsvUploadInput(container),
      createCsvUploadFile('Name,Brain Region\nNeuron A,Cortex\n')
    );

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Brain Region row 1')).toHaveValue('Cortex');
    });

    await user.click(screen.getByLabelText('Brain Region row 1'));

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledTimes(2);
    });

    const infoTrigger = screen.getByRole('button', {
      name: 'Why Brain Region row 1 needs selection',
    });
    expect(infoTrigger).toHaveClass(
      'size-8',
      'rounded-full',
      'border-neutral-200',
      'bg-neutral-50'
    );
    await user.hover(infoTrigger);

    expect(
      await screen.findByText(
        'Multiple matches found for Brain Region. Choose one in the validator.'
      )
    ).toBeInTheDocument();
    const tooltipCopies = await screen.findAllByText(
      'Open the validator and choose the correct value for this cell.'
    );
    expect(tooltipCopies).not.toHaveLength(0);
    const tooltipCard = tooltipCopies[0]?.closest('[data-slot="tooltip-content"]');
    expect(tooltipCard).not.toBeNull();
    expect(tooltipCard).toHaveClass('rounded-2xl', 'border-neutral-200', 'bg-white');
    expect(screen.getByText('Cortex layer 2')).toBeInTheDocument();
    expect(screen.getByText('Cortex layer 5')).toBeInTheDocument();
  });

  it('keeps repair pipeline state visible but disabled until a digital reconstruction protocol is selected', async () => {
    const user = userEvent.setup();
    const searchProtocols = vi.fn(async (query: string) => {
      const normalizedQuery = query.trim().toLowerCase();

      if (normalizedQuery.includes('modified')) {
        return [
          {
            value: '11111111-1111-4111-8111-111111111111',
            label: 'Modified Protocol (modified_reconstruction)',
            metadata: {
              generationType: CellMorphologyGenerationType.ModifiedReconstruction.key,
            },
          },
        ];
      }

      if (normalizedQuery.includes('digital')) {
        return [
          {
            value: '22222222-2222-4222-8222-222222222222',
            label: 'Digital Protocol (digital_reconstruction)',
            metadata: {
              generationType: CellMorphologyGenerationType.DigitalReconstruction.key,
            },
          },
        ];
      }

      return [];
    });
    const services = createMockCellMorphologyImportServices({
      searchProtocols,
      searchProtocolsPage: vi.fn(async (query, context) => {
        const suggestions = await searchProtocols(query, context);
        return { suggestions, nextPageParam: null };
      }),
    });
    const morphologyAdapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      services,
    });

    renderWithQueryClient(
      <EntityImportFeature
        adapter={morphologyAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
      />
    );

    const repairField = screen.getByLabelText('Repair Pipeline State row 1');
    expect(repairField).toBeDisabled();

    await user.click(screen.getByLabelText('Protocol row 1'));

    const validatorInput = screen.getByLabelText('Validator value');
    await user.clear(validatorInput);
    await user.type(validatorInput, 'Modified');

    await waitFor(() => {
      expect(screen.getByLabelText('Protocol row 1')).toHaveValue(
        'Modified Protocol (modified_reconstruction)'
      );
      expect(screen.getByLabelText('Repair Pipeline State row 1')).toBeDisabled();
    });

    await user.clear(validatorInput);
    await user.type(validatorInput, 'Digital');

    await waitFor(() => {
      expect(screen.getByLabelText('Protocol row 1')).toHaveValue(
        'Digital Protocol (digital_reconstruction)'
      );
      expect(screen.getByLabelText('Repair Pipeline State row 1')).not.toBeDisabled();
    });
  });

  it('keeps the validator open with select placeholders and exposes all only in the column selector', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        title="Validator Multi Column Import"
        onClose={() => {}}
        adapter={validatorMultiColumnAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', status: 'draft', notes: 'Alpha' },
          { name: 'Neuron B', status: 'published', notes: 'Beta' },
        ]}
      />
    );

    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByLabelText('Select column')).toHaveTextContent('Select');
    expect(screen.getByLabelText('Select row')).toHaveTextContent('Select');
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Select column'));
    expect(await screen.findByText('All')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByLabelText('Select row'));
    expect(within(getOpenSelectContent()).queryByText('All')).not.toBeInTheDocument();
  });

  it('renders editable all-column validator boxes and keeps their row arrows synchronized', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        title="Validator Multi Column Import"
        onClose={() => {}}
        adapter={validatorMultiColumnAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', status: 'draft', notes: 'Alpha' },
          { name: 'Neuron B', status: 'published', notes: 'Beta' },
        ]}
      />
    );

    await user.click(screen.getByLabelText('Select column'));
    await user.click(await screen.findByText('All'));

    await user.click(screen.getByLabelText('Select row'));
    await user.click(within(getOpenSelectContent()).getByText('1'));

    expect(screen.getByRole('region', { name: 'Validator box Name' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Validator box Status' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Validator box Notes' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Select row for Status')).not.toBeInTheDocument();

    expect(
      within(screen.getByRole('region', { name: 'Validator box Name' })).getByText('Neuron A')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Validator box Status' })).getByRole('combobox', {
        name: 'Validator value',
      })
    ).toHaveTextContent('Draft');
    expect(
      within(screen.getByRole('region', { name: 'Validator box Notes' })).getByText('Alpha')
    ).toBeInTheDocument();

    const statusBox = screen.getByRole('region', { name: 'Validator box Status' });
    await user.click(within(statusBox).getByRole('button', { name: 'Next row' }));

    await waitFor(() => {
      expect(
        within(screen.getByRole('region', { name: 'Validator box Name' })).getByText('Neuron B')
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('region', { name: 'Validator box Status' })).getByRole('combobox', {
          name: 'Validator value',
        })
      ).toHaveTextContent('Published');
      expect(
        within(screen.getByRole('region', { name: 'Validator box Notes' })).getByText('Beta')
      ).toBeInTheDocument();
    });

    const notesBox = screen.getByRole('region', { name: 'Validator box Notes' });
    const notesInput = within(notesBox).getByLabelText('Validator value');
    await user.clear(notesInput);
    await user.type(notesInput, 'Gamma');
    await user.click(within(notesBox).getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Notes row 2')).toHaveValue('Gamma');
      expect(screen.getByLabelText('Name row 2')).toHaveValue('Neuron B');
      expect(screen.getByLabelText('Status row 2')).toHaveTextContent('Published');
    });
  });

  it('scrolls the table horizontally when a specific validator column is selected', async () => {
    const user = userEvent.setup();
    const { container } = renderWithQueryClient(
      <EntityImportFeature
        title="Validator Multi Column Import"
        onClose={() => {}}
        adapter={validatorMultiColumnAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ name: 'Neuron A', status: 'draft', notes: 'Alpha' }]}
      />
    );

    const tableBody = container.querySelector('.ant-table-body') as HTMLDivElement | null;
    expect(tableBody).toBeInTheDocument();
    if (!tableBody) {
      throw new Error('Expected AntD table body to exist');
    }

    Object.defineProperty(tableBody, 'clientWidth', {
      configurable: true,
      value: 220,
    });
    tableBody.scrollLeft = 0;

    await user.click(screen.getByLabelText('Select row'));
    await user.click(within(getOpenSelectContent()).getByText('1'));
    await user.click(screen.getByLabelText('Select column'));
    await user.click(within(getOpenSelectContent()).getByText('3'));

    await waitFor(() => {
      expect(tableBody.scrollLeft).toBeGreaterThan(0);
    });
  });

  it('renders repair pipeline state as a full-cell select and keeps the chosen label visible', async () => {
    const user = userEvent.setup();
    const searchProtocols = vi.fn(async (query: string) => {
      const normalizedQuery = query.trim().toLowerCase();

      if (normalizedQuery.includes('digital')) {
        return [
          {
            value: '22222222-2222-4222-8222-222222222222',
            label: 'Digital Protocol (digital_reconstruction)',
            metadata: {
              generationType: CellMorphologyGenerationType.DigitalReconstruction.key,
            },
          },
        ];
      }

      return [];
    });
    const services = createMockCellMorphologyImportServices({
      searchProtocols,
      searchProtocolsPage: vi.fn(async (query, context) => {
        const suggestions = await searchProtocols(query, context);
        return { suggestions, nextPageParam: null };
      }),
    });
    const morphologyAdapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      services,
    });

    renderWithQueryClient(
      <EntityImportFeature
        title="Morphology Import"
        onClose={() => {}}
        adapter={morphologyAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
      />
    );

    await user.click(screen.getByLabelText('Protocol row 1'));

    const validatorInput = screen.getByLabelText('Validator value');
    await user.clear(validatorInput);
    await user.type(validatorInput, 'Digital');

    await waitFor(() => {
      expect(screen.getByLabelText('Repair Pipeline State row 1')).not.toBeDisabled();
    });

    const repairField = screen.getByLabelText('Repair Pipeline State row 1');
    expect(repairField).toHaveClass('w-full');

    await user.click(repairField);

    const selectContent = getOpenSelectContent();
    expect(selectContent).toHaveClass('bg-white', 'border-neutral-200');

    await user.click(within(selectContent).getByText('Curated'));

    await waitFor(() => {
      expect(screen.getByLabelText('Repair Pipeline State row 1')).toHaveTextContent('Curated');
    });
  });

  it('renders configurable full-cell file triggers with generic labels', () => {
    renderWithQueryClient(
      <EntityImportFeature
        title="File Import"
        onClose={() => {}}
        adapter={fileAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ asset: '' }]}
      />
    );

    const assetButton = screen.getByRole('button', { name: 'Asset row 1' });
    expect(assetButton).toHaveTextContent('Add file(s) (.json)');
    expect(assetButton).toHaveClass('w-full', 'min-h-[52px]');

    const assetInput = screen.getByLabelText('Asset row 1 file input');
    expect(assetInput).toHaveAttribute('accept', 'application/json,.json');
    expect(assetInput).toHaveAttribute('multiple');
  });

  it('uses the same generic add-file label pattern for morphology uploads', () => {
    const morphologyAdapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
    });

    renderWithQueryClient(
      <EntityImportFeature
        title="Morphology Import"
        onClose={() => {}}
        adapter={morphologyAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
      />
    );

    expect(screen.getByRole('button', { name: 'Morphology File row 1' })).toHaveTextContent(
      'Add file(s) (.swc)'
    );
  });

  it('rejects files that exceed the configured size limit', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        title="File Import"
        onClose={() => {}}
        adapter={fileAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ asset: '' }]}
      />
    );

    const assetInput = screen.getByLabelText('Asset row 1 file input');
    await user.upload(
      assetInput,
      new File(['123456'], 'asset.json', {
        type: 'application/json',
      })
    );

    expect(screen.getByText(/Asset files must be 5 Bytes or smaller/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asset row 1' })).toHaveTextContent(
      'Add file(s) (.json)'
    );
  });

  it('rejects selections that exceed the configured max file count', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EntityImportFeature
        title="File Import"
        onClose={() => {}}
        adapter={fileAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ asset: '' }]}
      />
    );

    const assetInput = screen.getByLabelText('Asset row 1 file input');
    await user.upload(assetInput, [
      new File(['1'], 'one.json', { type: 'application/json' }),
      new File(['2'], 'two.json', { type: 'application/json' }),
      new File(['3'], 'three.json', { type: 'application/json' }),
    ]);

    expect(screen.getByText(/Asset accepts at most 2 files/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asset row 1' })).toHaveTextContent(
      'Add file(s) (.json)'
    );
  });

  it('shows a template dropdown named from templateFileName and downloads csv + guide', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:template');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    renderWithQueryClient(
      <EntityImportFeature
        title="File Import"
        onClose={() => {}}
        adapter={fileAdapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[{ asset: '' }]}
      />
    );

    const templateButton = screen.getByRole('button', {
      name: 'cell-morphology-import-template.csv',
    });
    await user.click(templateButton);
    await user.click(screen.getByRole('menuitem', { name: 'Download CSV' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const csvBlob = createObjectURL.mock.calls[0][0] as Blob;
    expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
    await expect(csvBlob.text()).resolves.toContain('Asset');

    await user.click(templateButton);
    await user.click(screen.getByRole('menuitem', { name: 'Download Guide' }));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const guideBlob = createObjectURL.mock.calls[1][0] as Blob;
    expect(guideBlob.type).toBe('text/markdown;charset=utf-8;');
    await expect(guideBlob.text()).resolves.toContain('# Cell Morphology CSV Guide');
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
