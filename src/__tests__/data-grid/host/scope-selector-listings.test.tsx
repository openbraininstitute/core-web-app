import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import { BrowseEntityGrid } from '@/features/data-grid/host/browse-entity-grid';
import { defaultFlags } from '@/features/feature-flags/config';
import { FlagsProvider } from '@/features/feature-flags/provider';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { IGridRendererProps } from '@/features/data-grid/react/renderer';

let columnIds: string[] = [];

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'pr' }),
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => ({ selectedBrainRegion: undefined }),
}));
vi.mock('@/features/data-grid/renderers/aggrid', () => ({
  AgGridRenderer: (props: IGridRendererProps<unknown>) => {
    columnIds = props.columns.map((c) => c.id);
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

async function columnsFor(props: {
  dataType: TExtendedEntitiesTypeDict;
  section: TWorkspaceSection;
  requireScopeSelector?: boolean;
  scope?: TWorkspaceScope;
  picker?: boolean;
}) {
  const definition = getEntityGridDefinition(props.dataType);
  if (!definition) throw new Error(`no grid definition for ${props.dataType}`);
  columnIds = [];
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <FlagsProvider flags={defaultFlags}>
        <BrowseEntityGrid
          definition={definition}
          dataType={props.dataType}
          section={props.section}
          scope={props.scope}
          requireScopeSelector={props.requireScopeSelector}
          requireMiniDetailView={false}
          requireBrainRegion={false}
          allowQuery={false}
          mainTableProps={
            props.picker ? { selectionType: 'radio', onRowsSelected: () => {} } : undefined
          }
        />
      </FlagsProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(columnIds.length).toBeGreaterThan(0));
  return columnIds;
}

describe('listings with a scope selector', () => {
  it.each([
    ['a Data table', WorkspaceSection.Data, ExtendedEntitiesTypeDict.CellMorphology, false],
    ['a workflow picker', WorkspaceSection.BuildWorkflow, ExtendedEntitiesTypeDict.Emodel, true],
    [
      'a notebooks listing',
      WorkspaceSection.Notebooks,
      ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
      false,
    ],
  ] as const)('lead %s with the scope column', async (_, section, dataType, picker) => {
    const ids = await columnsFor({ dataType, section, picker, requireScopeSelector: true });
    expect(ids[0]).toBe('scope');
  });

  it('leave a listing pinned to both scopes without a selector unmarked', async () => {
    const ids = await columnsFor({
      dataType: ExtendedEntitiesTypeDict.Emodel,
      section: WorkspaceSection.Data,
      scope: WorkspaceScope.Combined,
    });
    expect(ids).not.toContain('scope');
  });
});
