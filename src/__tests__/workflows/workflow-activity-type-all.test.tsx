import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';

import type { ReactNode } from 'react';
import type { IAllWorkflowsSource } from '@/ui/segments/workflows/elements/workflow-activity-all';

const merged = vi.hoisted(() => vi.fn());

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
// Only the toolbar's menus: what is listed shows in the data source the table builds.
vi.mock('@/features/data-grid/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DataGrid: ({ toolbarSlots }: { toolbarSlots: { entityType: ReactNode } }) =>
    toolbarSlots.entityType,
}));
vi.mock('@/ui/segments/workflows/elements/workflow-activity-all', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/ui/segments/workflows/elements/workflow-activity-all')>();
  return {
    ...actual,
    createAllWorkflowsDataSource: (
      args: Parameters<typeof actual.createAllWorkflowsDataSource>[0]
    ) => {
      merged(args.sources, args.onGaps);
      return actual.createAllWorkflowsDataSource(args);
    },
  };
});

function table(searchParams: string) {
  const onUrlUpdate = vi.fn();
  render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <WorkflowActivity />
    </NuqsTestingAdapter>
  );
  return onUrlUpdate;
}

const listedCategories = () =>
  new Set((merged.mock.lastCall?.[0] as IAllWorkflowsSource[]).map((source) => source.activity));

beforeEach(() => merged.mockClear());

describe('the workflows table’s listing', () => {
  it('opens on one listing where the link names nothing, not on every workflow merged', () => {
    table('');

    expect(merged).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflow-type-filter')).not.toHaveTextContent('All');
  });

  it('merges every category’s workflows under Category All', () => {
    table('?tactivity=all&ttype=all');

    expect(listedCategories().size).toBeGreaterThan(1);
    expect(screen.queryByTestId('workflow-type-filter')).toBeNull();
  });

  it('merges one category’s workflows under Type All', () => {
    table(`?tactivity=${ActivityValues.Simulate}&ttype=all`);

    expect(listedCategories()).toEqual(new Set([ActivityValues.Simulate]));
    expect(screen.getByTestId('workflow-type-filter')).toHaveTextContent('All');
  });

  it('merges one category’s workflows when a link names no type', () => {
    table(`?tactivity=${ActivityValues.Simulate}`);

    expect(listedCategories()).toEqual(new Set([ActivityValues.Simulate]));
  });

  it('says, above the table, which workflows a page is missing and that rows lie beyond it', () => {
    table('?tactivity=all');
    expect(screen.queryByRole('status')).toBeNull();

    act(() => merged.mock.lastCall?.[1]({ failed: ['ME-model', 'Synaptome'], unlisted: 12 }));

    expect(screen.getByRole('status').textContent).toContain('ME-model, Synaptome');
    expect(screen.getByRole('status').textContent).toContain('first 1,000');

    act(() => merged.mock.lastCall?.[1]({ failed: [], unlisted: 0 }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('lists one type on its own once it is picked', () => {
    table(
      `?tactivity=${ActivityValues.Simulate}&ttype=${ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation}`
    );

    expect(merged).not.toHaveBeenCalled();
  });

  it('puts Type All in the URL with a picked category', async () => {
    const onUrlUpdate = table(
      `?tactivity=${ActivityValues.Build}&ttype=${ExtendedEntitiesTypeDict.MEModelBuildCampaign}`
    );

    fireEvent.keyDown(screen.getByTestId('workflow-category-filter'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('option', { name: 'Simulate' }), { key: 'Enter' });

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const { searchParams } = onUrlUpdate.mock.lastCall?.[0] as { searchParams: URLSearchParams };
    expect(searchParams.get('tactivity')).toBe(ActivityValues.Simulate);
    expect(searchParams.get('ttype')).toBe('all');
  });
});
