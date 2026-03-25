import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  CellStatus,
  createIdleRemoteState,
  DependencyState,
  type ImportCellState,
  type ImportRowState,
  type ImportSessionState,
  RowStatus,
} from '../../core/contracts';
import { createCellMorphologyImportAdapter } from './adapter';
import { ContributionsEditor } from './contributions-editor';

import type { ReactElement } from 'react';
import type { EntityImportActions, EntityImportRuntimeContext } from '../../core/adapter';
import type { CellMorphologyImportServices } from './services';

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function createMockActions(): EntityImportActions {
  return {
    addRow: vi.fn(),
    acceptCorrection: vi.fn(),
    applySuggestion: vi.fn(),
    chooseSuggestion: vi.fn(),
    dismissNotification: vi.fn(),
    rejectCorrection: vi.fn(),
    requestSuggestions: vi.fn(async () => {}),
    loadMoreSuggestions: vi.fn(),
    selectCell: vi.fn(),
    setCustomValue: vi.fn(),
    setFileValue: vi.fn(),
    submitRows: vi.fn(),
    updateCellValue: vi.fn(),
  };
}

function createContributionCell(parsedValue: ImportCellState['parsedValue'] = []): ImportCellState {
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

function createContributionRow(cell: ImportCellState): ImportRowState {
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
}: {
  onSetCustomValue: ReturnType<typeof vi.fn>;
  services: Pick<
    CellMorphologyImportServices,
    'searchPersonsPage' | 'searchOrganizationsPage' | 'searchConsortiaPage' | 'searchRolesPage'
  >;
}) {
  const [cell, setCell] = useState<ImportCellState>(() => createContributionCell());
  const row = useMemo(() => createContributionRow(cell), [cell]);
  const actions = useMemo(() => {
    const baseActions = createMockActions();
    return {
      ...baseActions,
      setCustomValue: (params: {
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
    } satisfies EntityImportActions;
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

const context: EntityImportRuntimeContext = {
  projectId: 'project-1',
  virtualLabId: 'lab-1',
};

describe('ContributionsEditor', () => {
  it('adds a blank contribution row when clicking add contribution', async () => {
    const user = userEvent.setup();
    const setCustomValueSpy = vi.fn();
    const services = {
      searchPersonsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      searchOrganizationsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      searchConsortiaPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      searchRolesPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    } as unknown as Pick<
      CellMorphologyImportServices,
      'searchPersonsPage' | 'searchOrganizationsPage' | 'searchConsortiaPage' | 'searchRolesPage'
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
      searchPersonsPage: vi.fn(async (query: string) => ({
        suggestions: query.toLowerCase().includes('alice')
          ? [{ value: 'person-1', label: 'Alice Example' }]
          : [],
        nextPageParam: null,
      })),
      searchOrganizationsPage: vi.fn(async () => ({
        suggestions: [],
        nextPageParam: null,
      })),
      searchConsortiaPage: vi.fn(async () => ({
        suggestions: [],
        nextPageParam: null,
      })),
      searchRolesPage: vi.fn(async (query: string) => ({
        suggestions: query.toLowerCase().includes('auth')
          ? [{ value: 'role-1', label: 'Author' }]
          : [],
        nextPageParam: null,
      })),
    } as unknown as Pick<
      CellMorphologyImportServices,
      'searchPersonsPage' | 'searchOrganizationsPage' | 'searchConsortiaPage' | 'searchRolesPage'
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

  it('renders a full-height single-contributor preview with an overflow indicator', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      services: {} as CellMorphologyImportServices,
    });
    const contributionsField = adapter.fields.find((field) => field.path === 'contributions');
    if (!contributionsField?.tableRenderer) {
      throw new Error('Expected contributions field table renderer');
    }

    const cell = createContributionCell([
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
    ]);
    const row = createContributionRow(cell);
    const session: ImportSessionState = {
      fields: adapter.fields,
      rows: [row],
      selectedCell: null,
      notifications: [],
      summary: {
        canSubmit: false,
        invalidRequiredCellCount: 0,
      },
    };

    render(
      contributionsField.tableRenderer({
        field: contributionsField,
        cell,
        row,
        session,
        context,
        actions: createMockActions(),
      })
    );

    expect(screen.getByRole('button', { name: 'Contributions row 1' })).toHaveClass('min-h-[52px]');
    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.queryByText('Bob Example')).not.toBeInTheDocument();
    expect(screen.getByLabelText('More contributions')).toBeInTheDocument();
    expect(screen.queryByText('2 contributors')).not.toBeInTheDocument();
  });

  it('keeps contribution fields aligned in a single row', () => {
    renderWithQueryClient(
      <ContributionEditorHarness
        onSetCustomValue={vi.fn()}
        services={
          {
            searchPersonsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
            searchOrganizationsPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
            searchConsortiaPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
            searchRolesPage: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
          } as unknown as Pick<
            CellMorphologyImportServices,
            | 'searchPersonsPage'
            | 'searchOrganizationsPage'
            | 'searchConsortiaPage'
            | 'searchRolesPage'
          >
        }
      />
    );

    const rowLayout = screen.getByTestId('contribution-row-layout-0');
    expect(rowLayout).toHaveClass('flex', 'flex-nowrap', 'items-end');
  });
});
