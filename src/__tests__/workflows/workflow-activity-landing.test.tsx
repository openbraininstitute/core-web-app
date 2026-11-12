import { render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';

import type { ReactNode } from 'react';

const listed = vi.hoisted(() => vi.fn());

vi.mock('@/features/feature-flags', () => ({ useFlags: () => ({}) }));
vi.mock('@/ui/segments/workflows/elements/workflow-details-editor', () => ({
  WORKFLOW_ACTIVITY_QUERY_KEY: 'workflow-activity',
  WorkflowDetailsEditor: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/ui/hooks/create-break-point', () => ({ useDefaultBreakpoint: () => 'l' }));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/features/data-grid/renderers/aggrid', () => ({ AgGridRenderer: () => null }));
vi.mock('@/features/data-grid/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DataGrid: ({ toolbarSlots }: { toolbarSlots: { entityType: ReactNode } }) =>
    toolbarSlots.entityType,
}));
vi.mock('@/features/data-grid/bindings/entitycore/data-source.paged', () => ({
  createEntitycorePagedDataSource: (args: { dataType: string }) => {
    listed(args.dataType);
    return {};
  },
}));

function table(searchParams: string) {
  render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <WorkflowActivity />
    </NuqsTestingAdapter>
  );
}

describe('the workflows table’s listing', () => {
  it('opens on ME-model builds where the link names nothing', () => {
    table('');

    expect(listed).toHaveBeenLastCalledWith(ExtendedEntitiesTypeDict.MEModelBuildCampaign);
    expect(screen.getByTestId('workflow-category-filter')).toHaveTextContent('Build');
  });

  it('lists the type the link names', () => {
    table(
      `?tactivity=${ActivityValues.Simulate}&ttype=${ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation}`
    );

    expect(listed).toHaveBeenLastCalledWith(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation);
    expect(screen.getByTestId('workflow-category-filter')).toHaveTextContent('Simulat');
  });
});
