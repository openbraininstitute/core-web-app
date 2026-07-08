import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { ApiError } from '@/api/error';
import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  speciesSelectionModeAtom,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import {
  SPECIES_TAXONOMY_IDS,
  SpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';

import type React from 'react';
import type { ComponentProps } from 'react';
import type {
  IWorkspaceSpecies,
  TSpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';

const listQuery = vi.hoisted(() => ({
  data: {
    data: [{ id: 'entity-1', name: 'Test entity' }],
    pagination: { total: 1, page: 1, size: 20 },
  },
  error: null as Error | null,
  isFetching: false,
}));

const mouseSpecies: IWorkspaceSpecies = {
  id: 's-mouse',
  name: 'Mus musculus',
  taxonomyId: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
  hierarchId: 'h-mouse',
  displayName: 'Mouse',
};

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'virtual-lab', projectId: 'project' }),
}));

vi.mock('@/api/virtual-lab-svc/queries/virtual-lab', () => ({
  getVirtualLab: vi.fn().mockResolvedValue({ id: 'virtual-lab', name: 'Test Lab' }),
}));

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: 'public' }),
}));

vi.mock('@/ui/hooks/use-query-extended-entity-type', () => ({
  useQueryExtendedEntityType: () => listQuery,
  useQueryExtendedEntityTypeFacets: () => ({ data: {}, error: null, isPending: false }),
  useQueryParameters: () => ({}),
}));

vi.mock('@/ui/segments/mini-detail-view/event', () => ({
  useMiniDetailView: () => ({ mdv: false, setMdv: vi.fn() }),
  useSelectEntityClickEvent: vi.fn(),
  makeSelectEntityClickEvent: vi.fn(),
}));

vi.mock('@/ui/segments/mini-detail-view', () => ({
  MiniDetailView: () => null,
}));

vi.mock('@/ui/segments/explore/circuit/elements/download-panel', () => ({
  DownloadPanel: () => null,
}));

vi.mock('@/ui/molecules/generic-error', () => ({
  GenericError: ({
    content,
    shouldContactSupport,
  }: {
    content: React.ReactNode;
    shouldContactSupport?: boolean;
  }) => (
    <div data-testid="generic-error">
      <div data-testid="generic-error-content">{content}</div>
      {shouldContactSupport ? (
        <span data-testid="generic-error-support">please contact support</span>
      ) : null}
    </div>
  ),
}));

vi.mock('@/ui/segments/data-table', async () => {
  const { useAtomValue } = await import('jotai');
  const { coreFiltersAtom } = await import('@/ui/segments/data-table/elements/context');

  function BrowseEntityTableStub({
    columns,
    dataType,
    dataKey,
  }: {
    columns: Array<{ key?: string | number }>;
    dataType: TExtendedEntitiesTypeDict;
    dataKey: string;
  }) {
    const filters = useAtomValue(coreFiltersAtom({ dataType, key: dataKey }));

    return (
      <div data-testid="browse-entity-table-stub">
        <ul data-testid="visible-columns" aria-label="visible columns">
          {columns.map((column) => (
            <li key={String(column.key)} data-testid={`column-${String(column.key)}`}>
              {String(column.key)}
            </li>
          ))}
        </ul>
        <ul data-testid="default-filters" aria-label="default filters">
          {filters?.map((filter) => (
            <li key={filter.field} data-testid={`filter-${filter.field}`}>
              {filter.field}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return { default: BrowseEntityTableStub };
});

vi.mock('next/dynamic', async () => {
  const dataTable = await import('@/ui/segments/data-table');
  return {
    default: () => dataTable.default,
  };
});

import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

type BrowseEntityProps = ComponentProps<typeof BrowseEntityScope>;

function renderBrowseEntityTable(
  props: Partial<BrowseEntityProps> = {},
  {
    speciesSelectionMode = SpeciesSelectionMode.All,
    workspaceSpecies = null,
    store = createStore(),
  }: {
    speciesSelectionMode?: TSpeciesSelectionMode;
    workspaceSpecies?: IWorkspaceSpecies | null;
    store?: ReturnType<typeof createStore>;
  } = {}
) {
  store.set(speciesSelectionModeAtom, speciesSelectionMode);
  store.set(workspaceHierarchySpeciesAtom, workspaceSpecies);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <BrowseEntityScope
          dataType={ExtendedEntitiesTypeDict.IonChannelModel}
          section={WorkspaceSection.Data}
          requireMiniDetailView={false}
          allowQuery
          {...props}
        />
      </Provider>
    </QueryClientProvider>
  );

  return { store, queryClient, ...view };
}

function rerenderBrowseEntityTable(
  rerender: (ui: React.ReactElement) => void,
  store: ReturnType<typeof createStore>,
  props: Partial<BrowseEntityProps> = {},
  queryClient?: QueryClient
) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  rerender(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <BrowseEntityScope
          dataType={ExtendedEntitiesTypeDict.IonChannelModel}
          section={WorkspaceSection.Data}
          requireMiniDetailView={false}
          allowQuery
          {...props}
        />
      </Provider>
    </QueryClientProvider>
  );
}

function expectColumnVisibility(columnKey: string, visible: boolean) {
  const element = screen.queryByTestId(`column-${columnKey}`);
  if (visible) {
    expect(element).toBeInTheDocument();
    return;
  }
  expect(element).not.toBeInTheDocument();
}

function expectFilterVisibility(filterField: string, visible: boolean) {
  const element = screen.queryByTestId(`filter-${filterField}`);
  if (visible) {
    expect(element).toBeInTheDocument();
    return;
  }
  expect(element).not.toBeInTheDocument();
}

describe('BrowseEntityScope table columns and filters', () => {
  beforeEach(() => {
    listQuery.error = null;
    listQuery.isFetching = false;
    listQuery.data = {
      data: [{ id: 'entity-1', name: 'Test entity' }],
      pagination: { total: 1, page: 1, size: 20 },
    };
  });

  it('shows the species column and filter on data browse when all species is selected', async () => {
    renderBrowseEntityTable();

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
    expect(screen.getByTestId('data-table-container')).toBeInTheDocument();
  });

  it('keeps the species column and filter on data browse when a single species is focused', async () => {
    renderBrowseEntityTable(
      {},
      {
        speciesSelectionMode: SpeciesSelectionMode.Focused,
        workspaceSpecies: mouseSpecies,
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
  });

  it('shows the species column for experimental data browse in all-species mode', async () => {
    renderBrowseEntityTable({
      dataType: ExtendedEntitiesTypeDict.CellMorphology,
    });

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
  });

  it('does not show the species column on simulate workflow listings', async () => {
    renderBrowseEntityTable({
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.SimulateWorkflow,
    });

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.SpeciesName, false);
    expectFilterVisibility(EntityCoreFields.SpeciesName, false);
  });

  it('shows the species column on build workflow when all species is selected', async () => {
    renderBrowseEntityTable({
      dataType: ExtendedEntitiesTypeDict.IonChannelRecording,
      section: WorkspaceSection.BuildWorkflow,
    });

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
  });

  it('always keeps core listing columns visible alongside species context changes', async () => {
    renderBrowseEntityTable();

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.Name, true);
    expectColumnVisibility(EntityCoreFields.BrainRegion, true);
  });

  it('keeps the species column on build workflow when a single species is focused', async () => {
    renderBrowseEntityTable(
      {
        dataType: ExtendedEntitiesTypeDict.IonChannelRecording,
        section: WorkspaceSection.BuildWorkflow,
      },
      {
        speciesSelectionMode: SpeciesSelectionMode.Focused,
        workspaceSpecies: mouseSpecies,
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId('browse-entity-table-stub')).toBeInTheDocument();
    });

    expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
  });

  it('keeps the species column after switching from all species to a focused species', async () => {
    const store = createStore();
    const { rerender } = renderBrowseEntityTable({}, { store });

    await waitFor(() => {
      expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    });

    await act(async () => {
      store.set(speciesSelectionModeAtom, SpeciesSelectionMode.Focused);
      store.set(workspaceHierarchySpeciesAtom, mouseSpecies);
      rerenderBrowseEntityTable(rerender, store);
    });

    await waitFor(() => {
      expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    });
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
  });

  it('keeps the species column when focused mode is selected before workspace species loads', async () => {
    const store = createStore();
    const { rerender } = renderBrowseEntityTable({}, { store });

    await waitFor(() => {
      expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    });

    await act(async () => {
      store.set(speciesSelectionModeAtom, SpeciesSelectionMode.Focused);
      store.set(workspaceHierarchySpeciesAtom, null);
      rerenderBrowseEntityTable(rerender, store);
    });

    await waitFor(() => {
      expectColumnVisibility(EntityCoreFields.SpeciesName, true);
    });
    expectFilterVisibility(EntityCoreFields.SpeciesName, true);
  });
});

describe('BrowseEntityScope fetch errors', () => {
  beforeEach(() => {
    listQuery.error = null;
    listQuery.isFetching = false;
    listQuery.data = {
      data: [{ id: 'entity-1', name: 'Test entity' }],
      pagination: { total: 1, page: 1, size: 20 },
    };
  });

  it('shows a generic support message when the listing query fails', async () => {
    listQuery.error = new Error('network failure');
    listQuery.data = undefined as never;

    renderBrowseEntityTable();

    expect(await screen.findByTestId('generic-error')).toBeInTheDocument();
    expect(screen.getByTestId('generic-error-content')).toHaveTextContent(
      /an error occurred while fetching/i
    );
    expect(screen.getByTestId('generic-error-support')).toBeInTheDocument();
    expect(screen.queryByTestId('browse-entity-table-stub')).not.toBeInTheDocument();
  });

  it('shows a permission message without support escalation for unauthorized listings', async () => {
    listQuery.error = new ApiError('Forbidden', { code: 'NOT_AUTHORIZED' });
    listQuery.data = undefined as never;

    renderBrowseEntityTable();

    expect(await screen.findByTestId('generic-error')).toBeInTheDocument();
    expect(screen.getByTestId('generic-error-content')).toHaveTextContent(/don't have permission/i);
    expect(screen.queryByTestId('generic-error-support')).not.toBeInTheDocument();
    expect(screen.queryByTestId('browse-entity-table-stub')).not.toBeInTheDocument();
  });
});
