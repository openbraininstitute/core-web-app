import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ContributionsEditor } from '@/features/entity-import/core/shared/contributions-editor';

import { createCellMorphologyImportAdapter } from '../../../adapters/cell-morphology/adapter';
import {
  CellStatus,
  createIdleRemoteState,
  DependencyState,
  type IImportCellState,
  type IImportRowState,
  type IImportSessionState,
  RowStatus,
} from '../../../core/contracts';

import type { ReactElement } from 'react';
import type { ICellMorphologyImportServices } from '../../../adapters/cell-morphology/services';
import type { IEntityImportActions, IEntityImportRuntimeContext } from '../../../core/adapter';

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function createMockActions(): IEntityImportActions {
  return {
    onAddRow: vi.fn(),
    onAcceptCorrection: vi.fn(),
    onApplySuggestion: vi.fn(),
    chooseSuggestion: vi.fn(),
    onClearRow: vi.fn(),
    onDeleteRow: vi.fn(),
    onDismissFeatureNotification: vi.fn(),
    onRejectCorrection: vi.fn(),
    requestSuggestions: vi.fn(async () => {}),
    loadMoreSuggestions: vi.fn(),
    onSelectCell: vi.fn(),
    onSetValidatorSelection: vi.fn(),
    onSetCustomValue: vi.fn(),
    onSetFileValue: vi.fn(),
    onSubmitRows: vi.fn(),
    onUpdateCellValue: vi.fn(),
    updateValidatorPreview: vi.fn(),
    onApplyManualValueToAll: vi.fn(),
  };
}

function createContributionCell(
  parsedValue: IImportCellState['parsedValue'] = []
): IImportCellState {
  return {
    fieldPath: 'contributions',
    rawValue: '',
    displayValue: null,
    parsedValue,
    status: CellStatus.Idle,
    issues: [],
    dependencyState: DependencyState.Ready,
    remoteState: createIdleRemoteState(),
    correctionDraft: null,
  };
}

function createContributionRow(cell: IImportCellState): IImportRowState {
  return {
    id: 'row-1',
    rowIndex: 0,
    cells: {
      contributions: cell,
    },
    rowStatus: RowStatus.Idle,
  };
}

function ContributionEditorHarness({
  onSetCustomValue,
  services,
  initialParsedValue,
}: {
  onSetCustomValue: ReturnType<typeof vi.fn>;
  services: Pick<
    ICellMorphologyImportServices,
    'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
  >;
  initialParsedValue?: IImportCellState['parsedValue'];
}) {
  const [cell, setCell] = useState<IImportCellState>(() =>
    createContributionCell(initialParsedValue)
  );
  const row = useMemo(() => createContributionRow(cell), [cell]);
  const actions = useMemo(() => {
    const baseActions = createMockActions();
    return {
      ...baseActions,
      onSetCustomValue: (params: {
        rowId: string;
        fieldPath: string;
        rawValue: string;
        displayValue?: string | null;
        parsedValue?: unknown;
      }) => {
        onSetCustomValue(params);
        setCell((current) => ({
          ...current,
          rawValue: params.rawValue,
          displayValue: params.displayValue ?? null,
          parsedValue: params.parsedValue ?? params.rawValue,
        }));
      },
    } satisfies IEntityImportActions;
  }, [onSetCustomValue]);

  return (
    <ContributionsEditor
      cell={cell}
      row={row}
      fieldPath="contributions"
      context={context}
      actions={actions}
      services={services}
    />
  );
}

function ContributionSummaryHarness({
  initialEntries,
  onSetCustomValue,
}: {
  initialEntries: Array<Record<string, unknown>>;
  onSetCustomValue?: ReturnType<typeof vi.fn>;
}) {
  const adapter = useMemo(
    () =>
      createCellMorphologyImportAdapter({
        defaultBrainRegionId: 'brain-region-1',
        services: {} as ICellMorphologyImportServices,
      }),
    []
  );
  const contributionsField = adapter.fields.find((field) => field.path === 'contributions');
  if (!contributionsField?.tableRenderer) {
    throw new Error('Expected contributions field table renderer');
  }

  const [cell, setCell] = useState<IImportCellState>(() => createContributionCell(initialEntries));
  const row = useMemo(() => createContributionRow(cell), [cell]);
  const session = useMemo<IImportSessionState>(
    () => ({
      fields: adapter.fields,
      rows: [row],
      selectedCell: null,
      validatorSelection: {
        rowId: null,
        fieldPath: null,
      },
      notifications: [],
      summary: {
        canSubmit: false,
        invalidRequiredCellCount: 0,
      },
    }),
    [adapter.fields, row]
  );
  const actions = useMemo(() => {
    const baseActions = createMockActions();
    return {
      ...baseActions,
      onSetCustomValue: (params: {
        rowId: string;
        fieldPath: string;
        rawValue: string;
        displayValue?: string | null;
        parsedValue?: unknown;
      }) => {
        onSetCustomValue?.(params);
        setCell((current) => ({
          ...current,
          rawValue: params.rawValue,
          displayValue: params.displayValue ?? null,
          parsedValue: params.parsedValue ?? params.rawValue,
        }));
      },
    } satisfies IEntityImportActions;
  }, [onSetCustomValue]);

  return contributionsField.tableRenderer({
    field: contributionsField,
    cell,
    row,
    session,
    context,
    actions,
  });
}

const context: IEntityImportRuntimeContext = {
  projectId: 'project-1',
  virtualLabId: 'lab-1',
};

function getVisibleContributionTooltipList(): HTMLElement {
  const visibleTooltipList = screen
    .getAllByTestId('contribution-tooltip-list')
    .find((element) => element.closest('[data-slot="tooltip-content"]'));

  if (!visibleTooltipList) {
    throw new Error('Expected visible contribution tooltip list');
  }

  return visibleTooltipList;
}

describe('ContributionsEditor', () => {
  it('adds a blank contribution row when clicking add contribution', async () => {
    const user = userEvent.setup();
    const setCustomValueSpy = vi.fn();
    const services = {
      queryPerson: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryOrganization: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryConsortium: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryRole: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    } as unknown as Pick<
      ICellMorphologyImportServices,
      'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
    >;

    renderWithQueryClient(
      <ContributionEditorHarness onSetCustomValue={setCustomValueSpy} services={services} />
    );

    expect(screen.getAllByRole('combobox')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: /Add contribution/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(6);
    });

    expect(setCustomValueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        fieldPath: 'contributions',
        parsedValue: [
          expect.objectContaining({
            agent_type: undefined,
            agent_id: '',
            role_id: '',
          }),
          expect.objectContaining({
            agent_type: undefined,
            agent_id: '',
            role_id: '',
          }),
        ],
      })
    );
  });

  it('uses async selects for type, contributor, and role and syncs ids + labels', async () => {
    const user = userEvent.setup();
    const setCustomValueSpy = vi.fn();
    const services = {
      queryPerson: vi.fn(async ({ query }: { query: string }) => ({
        suggestions: query.toLowerCase().includes('alice')
          ? [{ value: 'person-1', label: 'Alice Example' }]
          : [],
        nextPageParam: null,
      })),
      queryOrganization: vi.fn(async () => ({
        suggestions: [],
        nextPageParam: null,
      })),
      queryConsortium: vi.fn(async () => ({
        suggestions: [],
        nextPageParam: null,
      })),
      queryRole: vi.fn(async ({ query }: { query: string }) => ({
        suggestions: query.toLowerCase().includes('auth')
          ? [{ value: 'role-1', label: 'Author' }]
          : [],
        nextPageParam: null,
      })),
    } as unknown as Pick<
      ICellMorphologyImportServices,
      'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
    >;

    renderWithQueryClient(
      <ContributionEditorHarness onSetCustomValue={setCustomValueSpy} services={services} />
    );

    expect(screen.getAllByRole('combobox')).toHaveLength(3);

    const typeSelect = screen.getByRole('combobox', { name: 'Contributor type row 1' });
    const contributorSelect = screen.getByRole('combobox', { name: 'Contributor row 1' });
    const roleSelect = screen.getByRole('combobox', { name: 'Role row 1' });

    await waitFor(() => {
      expect(typeSelect).toBeEnabled();
      expect(roleSelect).toBeEnabled();
    });

    expect(contributorSelect).toBeDisabled();

    await user.click(typeSelect);
    await user.click(await screen.findByRole('button', { name: 'Person' }));

    expect(setCustomValueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        fieldPath: 'contributions',
        parsedValue: [expect.objectContaining({ agent_type: 'person' })],
      })
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Contributor row 1' })).toBeEnabled();
    });

    await user.click(contributorSelect);
    await user.type(await screen.findByPlaceholderText('Search contributor'), 'alice');
    await user.click(await screen.findByRole('button', { name: 'Alice Example' }));

    expect(setCustomValueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedValue: [
          expect.objectContaining({
            agent_type: 'person',
            agent_id: 'person-1',
            agent_label: 'Alice Example',
          }),
        ],
      })
    );

    await user.click(roleSelect);
    await user.type(await screen.findByPlaceholderText('Search role'), 'auth');
    await user.click(await screen.findByRole('button', { name: 'Author' }));

    expect(setCustomValueSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        fieldPath: 'contributions',
        rawValue: '1 contributor',
        parsedValue: [
          expect.objectContaining({
            agent_type: 'person',
            agent_id: 'person-1',
            agent_label: 'Alice Example',
            role_id: 'role-1',
            role_label: 'Author',
          }),
        ],
      })
    );
  });

  it('shows imported unresolved tuple text in the async selects before ids are resolved', async () => {
    const services = {
      queryPerson: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryOrganization: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryConsortium: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryRole: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    } as unknown as Pick<
      ICellMorphologyImportServices,
      'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
    >;

    renderWithQueryClient(
      <ContributionEditorHarness
        onSetCustomValue={vi.fn()}
        services={services}
        initialParsedValue={[
          {
            id: 'csv-contribution-1',
            source_tuple: '(person, Jane Doe, Author)',
            agent_type: 'person',
            agent_id: '',
            role_id: '',
            agent_label: '',
            role_label: '',
            imported_agent_text: 'Jane Doe',
            imported_role_text: 'Author',
            issues: ['Role is required for contribution 1.'],
          },
        ]}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Contributor type row 1' })).toHaveTextContent(
      'Person'
    );
    expect(screen.getByRole('combobox', { name: 'Contributor row 1' })).toHaveTextContent(
      'Jane Doe'
    );
    expect(screen.getByRole('combobox', { name: 'Role row 1' })).toHaveTextContent('Author');
  });

  it('renders a full-height single-contributor preview with an overflow count tooltip', async () => {
    const user = userEvent.setup();

    render(
      <ContributionSummaryHarness
        initialEntries={[
          {
            id: 'contribution-1',
            agent_type: 'person',
            agent_id: 'person-1',
            agent_label: 'Alice Example',
            role_id: 'role-1',
            role_label: 'Author',
          },
          {
            id: 'contribution-2',
            agent_type: 'person',
            agent_id: 'person-2',
            agent_label: 'Bob Example',
            role_id: 'role-2',
            role_label: 'Reviewer',
          },
          {
            id: 'contribution-3',
            agent_type: 'person',
            agent_id: 'person-3',
            agent_label: 'Carol Example',
            role_id: 'role-3',
            role_label: 'Curator',
          },
        ]}
      />
    );

    const mainButton = screen.getByRole('button', { name: 'Contributions row 1' });

    expect(mainButton).toHaveClass('min-h-[52px]');
    expect(within(mainButton).getByText('Alice Example')).toBeInTheDocument();
    expect(screen.queryByText('Bob Example')).not.toBeInTheDocument();
    expect(screen.queryByText('3 contributors')).not.toBeInTheDocument();

    const overflowTrigger = screen.getByRole('button', { name: 'Show 2 more contributions' });
    expect(overflowTrigger).toHaveTextContent('2');

    await user.hover(overflowTrigger);

    await waitFor(() => {
      expect(getVisibleContributionTooltipList()).toBeInTheDocument();
    });

    const tooltipList = getVisibleContributionTooltipList();
    expect(tooltipList).toHaveClass('max-h-64', 'overflow-y-auto');
    expect(within(tooltipList).getByText('Alice Example')).toBeInTheDocument();
    expect(within(tooltipList).getByText('Bob Example')).toBeInTheDocument();
    expect(within(tooltipList).getByText('Carol Example')).toBeInTheDocument();
    expect(within(tooltipList).getByText('Curator')).toBeInTheDocument();
  });

  it('renders imported unresolved contribution text in the table preview', () => {
    render(
      <ContributionSummaryHarness
        initialEntries={[
          {
            id: 'csv-contribution-1',
            source_tuple: '(person, Jane Doe, Author)',
            agent_type: 'person',
            agent_id: '',
            role_id: '',
            agent_label: '',
            role_label: '',
            imported_agent_text: 'Jane Doe',
            imported_role_text: 'Author',
            issues: ['Role is required for contribution 1.'],
          },
        ]}
      />
    );

    const mainButton = screen.getByRole('button', { name: 'Contributions row 1' });
    expect(within(mainButton).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(mainButton).getByText('Author')).toBeInTheDocument();
  });

  it('promotes a tooltip contribution to the main preview when selected', async () => {
    const user = userEvent.setup();
    const setCustomValueSpy = vi.fn();

    render(
      <ContributionSummaryHarness
        onSetCustomValue={setCustomValueSpy}
        initialEntries={[
          {
            id: 'contribution-1',
            agent_type: 'person',
            agent_id: 'person-1',
            agent_label: 'Alice Example',
            role_id: 'role-1',
            role_label: 'Author',
          },
          {
            id: 'contribution-2',
            agent_type: 'person',
            agent_id: 'person-2',
            agent_label: 'Bob Example',
            role_id: 'role-2',
            role_label: 'Reviewer',
          },
          {
            id: 'contribution-3',
            agent_type: 'person',
            agent_id: 'person-3',
            agent_label: 'Carol Example',
            role_id: 'role-3',
            role_label: 'Curator',
          },
        ]}
      />
    );

    await user.hover(screen.getByRole('button', { name: 'Show 2 more contributions' }));
    await waitFor(() => {
      expect(getVisibleContributionTooltipList()).toBeInTheDocument();
    });
    await user.click(
      within(getVisibleContributionTooltipList()).getByRole('button', {
        name: 'Make Bob Example primary contribution',
      })
    );

    await waitFor(() => {
      expect(
        within(screen.getByRole('button', { name: 'Contributions row 1' })).getByText('Bob Example')
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    });
    expect(setCustomValueSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        fieldPath: 'contributions',
        rawValue: '3 contributors',
        parsedValue: [
          expect.objectContaining({ id: 'contribution-2', agent_label: 'Bob Example' }),
          expect.objectContaining({ id: 'contribution-1', agent_label: 'Alice Example' }),
          expect.objectContaining({ id: 'contribution-3', agent_label: 'Carol Example' }),
        ],
      })
    );
  });

  it('preserves the current contribution row layout classes', () => {
    renderWithQueryClient(
      <ContributionEditorHarness
        onSetCustomValue={vi.fn()}
        services={
          {
            queryPerson: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
            queryOrganization: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
            queryConsortium: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
            queryRole: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
          } as unknown as Pick<
            ICellMorphologyImportServices,
            'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
          >
        }
      />
    );

    const rowLayout = screen.getByTestId('contribution-row-layout-0');
    expect(rowLayout).toHaveClass('flex', 'flex-col', 'flex-nowrap', 'items-center');
  });
});
