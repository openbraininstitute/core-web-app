import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { isEntitySelectableForWorkflow } from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import { EntityDataGrid } from '@/features/data-grid/host/browse-entity-grid';

import type { ReactNode } from 'react';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { IGridDataSource, IGridPage } from '@/features/data-grid/core';
import type { IGridRendererProps } from '@/features/data-grid/react/renderer';

let lastRendererProps: IGridRendererProps<EntityCoreIdentifiableNamed> | undefined;

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: WorkspaceScope.Public, isPending: false, changeScope: () => {} }),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'pr' }),
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => ({ selectedBrainRegion: undefined }),
}));
vi.mock('@/features/data-grid/renderers/aggrid', () => ({
  AgGridRenderer: (props: IGridRendererProps<EntityCoreIdentifiableNamed>) => {
    lastRendererProps = props;
    return null;
  },
}));
vi.mock('@/ui/segments/mini-detail-view', () => ({ MiniDetailView: () => null }));
vi.mock('@/ui/segments/explore/circuit/elements/download-panel', () => ({
  DownloadPanel: () => null,
}));
vi.mock('@/features/brain-region-hierarchy/components/region-banner', () => ({
  PortalRegionBanner: () => null,
}));

const source: IGridDataSource<EntityCoreIdentifiableNamed> = {
  fetch: async (): Promise<IGridPage<EntityCoreIdentifiableNamed>> => ({ rows: [], total: 0 }),
};

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function renderGrid(section: (typeof WorkspaceSection)[keyof typeof WorkspaceSection]) {
  const dataType = ExtendedEntitiesTypeDict.Memodel;
  const definition = getEntityGridDefinition(dataType);
  if (!definition) throw new Error('expected memodel grid definition');

  wrap(
    <EntityDataGrid
      definition={definition}
      requireMiniDetailView={false}
      section={section}
      dataType={dataType}
      dataSourceOverride={source}
      mainTableProps={{ selectionType: 'checkbox', onRowsSelected: () => {} }}
    />
  );
}

describe('EntityDataGrid workflow lifecycle gating', () => {
  it('applies isRowSelectable and gray-out on a workflow picker section', async () => {
    renderGrid(WorkspaceSection.SimulateWorkflow);

    await waitFor(() => expect(lastRendererProps).toBeDefined());
    expect(lastRendererProps?.isRowSelectable).toBe(isEntitySelectableForWorkflow);
    expect(lastRendererProps?.getRowClass).toBeTypeOf('function');
    expect(
      lastRendererProps?.getRowClass?.({
        id: 'd',
        name: 'draft',
        type: ExtendedEntitiesTypeDict.Memodel,
        legacy_id: null,
        lifecycle_status: EntityLifecycleStatus.Draft,
      } as EntityCoreIdentifiableNamed)
    ).toContain('[&_.ag-cell]:text-neutral-4!');
  });

  it('does not apply lifecycle gating on Data browse', async () => {
    lastRendererProps = undefined;
    renderGrid(WorkspaceSection.Data);

    await waitFor(() => expect(lastRendererProps).toBeDefined());
    expect(lastRendererProps?.isRowSelectable).toBeUndefined();
    expect(
      lastRendererProps?.getRowClass?.({
        id: 'd',
        name: 'draft',
        type: ExtendedEntitiesTypeDict.Memodel,
        legacy_id: null,
        lifecycle_status: EntityLifecycleStatus.Draft,
      } as EntityCoreIdentifiableNamed)
    ).toBeUndefined();
  });
});
