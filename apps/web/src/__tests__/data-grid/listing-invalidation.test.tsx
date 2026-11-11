import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { analysisNotebookTemplateSchema } from '@/features/data-grid/bindings/entitycore/schemas/analysis-notebook-template';
import { GridController } from '@/features/data-grid/core';
import { gridQueryKey, invalidateEntityListings } from '@/features/data-grid/listing-queries';
import { useDataGrid } from '@/features/data-grid/react/use-data-grid';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const TEMPLATE = ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;
const OTHER = ExtendedEntitiesTypeDict.CellMorphology;
const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

const { dataKey } = makeDataKey({
  ...workspace,
  section: WorkspaceSection.Notebooks,
  dataType: TEMPLATE,
  scope: WorkspaceScope.Project,
});

function mountGrid(client: QueryClient) {
  const controller = new GridController({
    schema: analysisNotebookTemplateSchema as never,
    context: { dataType: TEMPLATE, section: WorkspaceSection.Notebooks },
    defaultPageSize: 30,
  });
  const fetch = vi.fn(async () => ({ rows: [], total: 0 }));

  renderHook(
    () =>
      useDataGrid({
        controller: controller as never,
        dataSource: { fetch } as never,
        params: { authorized_project_id: workspace.projectId, authorized_public: false },
        // exactly how the host keys the browse listing
        queryKey: gridQueryKey(TEMPLATE, dataKey),
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  );

  return fetch;
}

/** A cached-but-unmounted query needs a real `queryFn`: `refetchType: 'all'` refetches it. */
function seed(client: QueryClient, key: QueryKey) {
  const queryFn = vi.fn(async () => 1);
  client.setQueryDefaults(key, { queryFn, staleTime: Infinity });
  client.setQueryData(key, 1);
  return queryFn;
}

describe('invalidateEntityListings', () => {
  it('refetches the mounted grid for the type', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fetch = mountGrid(client);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await invalidateEntityListings(client, TEMPLATE);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('refetches the sidebar counts even with no observer', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const dataCount = seed(
      client,
      keyBuilder.dataCountPerEntity({
        ...workspace,
        extendedEntityType: TEMPLATE,
        brainRegionId: 'region-1',
        scope: WorkspaceScope.Project,
      })
    );
    const notebookCount = seed(client, [
      'notebook-total-count',
      TEMPLATE,
      WorkspaceScope.Project,
      workspace.virtualLabId,
      workspace.projectId,
    ]);

    await invalidateEntityListings(client, TEMPLATE);

    expect(dataCount).toHaveBeenCalledTimes(1);
    expect(notebookCount).toHaveBeenCalledTimes(1);
  });

  it('leaves other entity types alone', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fetch = mountGrid(client);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const otherCount = seed(
      client,
      keyBuilder.dataCountPerEntity({
        ...workspace,
        extendedEntityType: OTHER,
        scope: WorkspaceScope.Project,
      })
    );

    await invalidateEntityListings(client, OTHER);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(otherCount).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no type is given', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fetch = mountGrid(client);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await invalidateEntityListings(client, []);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
