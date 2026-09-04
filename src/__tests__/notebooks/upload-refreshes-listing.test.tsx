import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { analysisNotebookTemplateSchema } from '@/features/data-grid/bindings/entitycore/schemas/analysis-notebook-template';
import { GridController } from '@/features/data-grid/core';
import { gridQueryKey } from '@/features/data-grid/listing-queries';
import { useDataGrid } from '@/features/data-grid/react/use-data-grid';
import { useAnalysisNotebookTemplatePipeline } from '@/ui/segments/contribute/analysis-notebook-template/pipeline';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';

import type { ReactNode } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));
vi.mock('@/api/entitycore/queries/experimental/analysis-notebook-template', () => ({
  createAnalysisNotebookTemplate: vi.fn(async () => ({ id: 'nb-1' })),
  uploadNotebookTemplateFile: vi.fn(async () => ({})),
}));
vi.mock('@/api/entitycore/queries/analysis-notebook-template', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deleteAnalysisNotebookTemplate: vi.fn(async () => ({})),
}));
vi.mock('@/api/entitycore/queries/general/contribution', () => ({
  createContribution: vi.fn(async () => ({})),
}));
vi.mock('@/ui/segments/contribute/analysis-notebook-template/steps/assets', () => ({
  getNotebookFiles: () => ({ notebook: new File(['{}'], 'notebook.ipynb') }),
}));

const TEMPLATE = ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;

/**
 * Regression for the upload that left the notebooks listing on its pre-upload rows:
 * the pipeline invalidated a query-key shape the grid stopped using.
 */
describe('notebook upload', () => {
  it('refetches the notebooks listing', async () => {
    const { dataKey } = makeDataKey({
      virtualLabId: 'vl-1',
      projectId: 'proj-1',
      section: WorkspaceSection.Notebooks,
      dataType: TEMPLATE,
      scope: WorkspaceScope.Project,
    });
    const controller = new GridController({
      schema: analysisNotebookTemplateSchema as never,
      context: { dataType: TEMPLATE, section: WorkspaceSection.Notebooks },
      defaultPageSize: 30,
    });
    const fetch = vi.fn(async () => ({ rows: [], total: 0 }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useDataGrid({
          controller: controller as never,
          dataSource: { fetch } as never,
          params: { authorized_project_id: 'proj-1', authorized_public: false },
          queryKey: gridQueryKey(TEMPLATE, dataKey),
        }),
      { wrapper }
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const { result } = renderHook(
      () => useAnalysisNotebookTemplatePipeline({ sessionId: 'session-1' }),
      { wrapper }
    );

    await result.current.createEntity({
      values: {
        setup: { name: 'My notebook', description: 'd', scale: 'single' },
        assets: {},
        contribution: [{}],
      } as never,
    });

    await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(1));
  });
});
