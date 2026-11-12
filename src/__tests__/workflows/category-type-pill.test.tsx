import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues, listWorkflows } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';

import type { ComponentProps } from 'react';

vi.mock('@/features/feature-flags', () => ({ useFlags: () => ({}) }));
vi.mock('@/ui/hooks/create-break-point', () => ({ useDefaultBreakpoint: () => 'l' }));

type TProps = ComponentProps<typeof ActivityAndTypeSelectors>;

function selectors(activity: TProps['activity'], entityType: TProps['entityType']) {
  const handlers = {
    onActivityChange: vi.fn(),
    onEntityTypeChange: vi.fn(),
  };
  render(
    <ActivityAndTypeSelectors
      activity={activity}
      entityType={entityType}
      onActivityChange={handlers.onActivityChange}
      onEntityTypeChange={handlers.onEntityTypeChange}
    />
  );
  return handlers;
}

/** Pick from a menu, by keyboard as Radix allows under jsdom. */
function choose(testId: string, name: string) {
  fireEvent.keyDown(screen.getByTestId(testId), { key: 'Enter' });
  fireEvent.keyDown(screen.getByRole('option', { name }), { key: 'Enter' });
}

/** The menu's first type, where a picked category lands. */
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

  it('narrows a category to a picked type', () => {
    const { onEntityTypeChange } = selectors(
      ActivityValues.Build,
      ExtendedEntitiesTypeDict.MEModelBuildCampaign
    );
    const { label, targetType } = firstBrowseType(ActivityValues.Build);

    choose('workflow-type-filter', label);

    expect(onEntityTypeChange).toHaveBeenCalledWith(targetType);
  });

  it('hold no All, and land a picked category on its first type', () => {
    const { onActivityChange, onEntityTypeChange } = selectors(
      ActivityValues.Build,
      ExtendedEntitiesTypeDict.MEModelBuildCampaign
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
