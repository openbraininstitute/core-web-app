/**
 * Regression: a workflow picker listing (workflow section + `mainTableProps.selectionType`)
 * lost the column chooser and advanced-filters buttons the Data browse listing offers.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import { EntityDataGrid } from '@/features/data-grid/host/browse-entity-grid';

import type { ReactNode } from 'react';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { IGridDataSource, IGridPage } from '@/features/data-grid/core';

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: WorkspaceScope.Public, isPending: false, changeScope: () => {} }),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'pr' }),
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => ({ selectedBrainRegion: undefined }),
}));
vi.mock('@/features/data-grid/renderers/aggrid', () => ({ AgGridRenderer: () => null }));
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

describe('picker listing toolbar controls', () => {
  it('renders the column chooser and the advanced filters button', async () => {
    const dataType = ExtendedEntitiesTypeDict.IonChannelRecording;
    const definition = getEntityGridDefinition(dataType);
    expect(definition).toBeDefined();
    if (!definition) return;

    wrap(
      <EntityDataGrid
        definition={definition}
        requireBrainRegion
        requireScopeSelector
        requireSpeciesSelector
        requireMiniDetailView={false}
        section={WorkspaceSection.BuildWorkflow}
        dataType={dataType}
        scope={WorkspaceScope.BuildIonChannelModel}
        dataSourceOverride={source}
        extraQueryParams={{ validation_result__passed: true }}
        mainTableProps={{ selectionType: 'radio', onRowsSelected: () => {} }}
      />
    );

    expect(await screen.findByRole('button', { name: 'Columns' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Advanced filters' })).toBeInTheDocument();
  });
});
