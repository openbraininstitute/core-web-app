import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues, listWorkflows } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import { ALL_WORKFLOWS } from '@/ui/segments/workflows/elements/workflow-activity-all';

import type { ComponentProps } from 'react';

vi.mock('@/features/feature-flags', () => ({ useFlags: () => ({}) }));
vi.mock('@/ui/hooks/create-break-point', () => ({ useDefaultBreakpoint: () => 'l' }));

type TProps = ComponentProps<typeof ActivityAndTypeSelectors>;

function selectors(
  activity: TProps['activity'],
  entityType: TProps['entityType'],
  { withAll = true } = {}
) {
  const handlers = {
    onActivityChange: vi.fn(),
    onEntityTypeChange: vi.fn(),
    onAllSelect: vi.fn(),
  };
  render(
    <ActivityAndTypeSelectors
      activity={activity}
      entityType={entityType}
      onActivityChange={handlers.onActivityChange}
      onEntityTypeChange={handlers.onEntityTypeChange}
      onAllSelect={withAll ? handlers.onAllSelect : undefined}
    />
  );
  return handlers;
}

/** Pick from a menu, by keyboard as Radix allows under jsdom. */
function choose(testId: string, name: string) {
  fireEvent.keyDown(screen.getByTestId(testId), { key: 'Enter' });
  fireEvent.keyDown(screen.getByRole('option', { name }), { key: 'Enter' });
}

/** The menu's first type, as the listing without All lands on it. */
const firstBrowseType = (activity: Parameters<typeof listWorkflows>[0]['activity']) => {
  const [first] = listWorkflows({ activity, context: 'browse', sort: 'order' }).filter(
    (w) => !w.disabled
  );
  return first;
};

describe('the workflows table’s Category and Type', () => {
  it('are two dropdowns in one pill', () => {
    selectors(ActivityValues.Build, ExtendedEntitiesTypeDict.MEModelBuildCampaign);

    const category = screen.getByTestId('workflow-category-filter');
    const type = screen.getByTestId('workflow-type-filter');
    expect(category.parentElement).toBe(type.parentElement);
    expect(screen.getByText(/Type/)).toBe(type.parentElement);
  });

  it('has no Type under All, which has none to narrow it by', () => {
    selectors(ALL_WORKFLOWS, ALL_WORKFLOWS);

    expect(screen.getByTestId('workflow-category-filter')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-type-filter')).toBeNull();
    expect(screen.queryByText(/Type/)).toBeNull();
  });

  it('shows Type All on a category not narrowed to a type', () => {
    selectors(ActivityValues.Simulate, ALL_WORKFLOWS);

    expect(screen.getByTestId('workflow-type-filter')).toHaveTextContent('All');
  });

  it('lands a picked category on Type All', () => {
    const { onAllSelect, onActivityChange, onEntityTypeChange } = selectors(
      ALL_WORKFLOWS,
      ALL_WORKFLOWS
    );

    choose('workflow-category-filter', 'Simulate');

    expect(onAllSelect).toHaveBeenCalledWith(ActivityValues.Simulate);
    expect(onActivityChange).not.toHaveBeenCalled();
    expect(onEntityTypeChange).not.toHaveBeenCalled();
  });

  it('lands on Type All from a type of another category too', () => {
    const { onAllSelect } = selectors(
      ActivityValues.Build,
      ExtendedEntitiesTypeDict.MEModelBuildCampaign
    );

    choose('workflow-category-filter', 'Simulate');

    expect(onAllSelect).toHaveBeenCalledWith(ActivityValues.Simulate);
  });

  it('goes from a type back to the category’s All', () => {
    const { onAllSelect, onEntityTypeChange } = selectors(
      ActivityValues.Build,
      ExtendedEntitiesTypeDict.MEModelBuildCampaign
    );

    choose('workflow-type-filter', 'All');

    expect(onAllSelect).toHaveBeenCalledWith(ActivityValues.Build);
    expect(onEntityTypeChange).not.toHaveBeenCalled();
  });

  it('narrows Type All to a picked type', () => {
    const { onAllSelect, onEntityTypeChange } = selectors(ActivityValues.Build, ALL_WORKFLOWS);
    const { label, targetType } = firstBrowseType(ActivityValues.Build);

    choose('workflow-type-filter', label);

    expect(onEntityTypeChange).toHaveBeenCalledWith(targetType);
    expect(onAllSelect).not.toHaveBeenCalled();
  });

  it('holds no All elsewhere, where a picked category lands on its first type', () => {
    const { onActivityChange, onEntityTypeChange } = selectors(
      ActivityValues.Build,
      ExtendedEntitiesTypeDict.MEModelBuildCampaign,
      { withAll: false }
    );

    fireEvent.keyDown(screen.getByTestId('workflow-type-filter'), { key: 'Enter' });
    expect(screen.queryByRole('option', { name: 'All' })).toBeNull();
    fireEvent.keyDown(
      screen.getByRole('option', { name: firstBrowseType(ActivityValues.Build).label }),
      { key: 'Escape' }
    );

    choose('workflow-category-filter', 'Simulate');

    expect(screen.queryByRole('option', { name: 'All' })).toBeNull();
    expect(onActivityChange).toHaveBeenCalledWith(ActivityValues.Simulate);
    expect(onEntityTypeChange).toHaveBeenCalledWith(
      firstBrowseType(ActivityValues.Simulate).targetType
    );
  });
});
