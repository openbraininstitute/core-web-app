import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import { ALL_WORKFLOWS } from '@/ui/segments/workflows/elements/workflow-activity-all';

import type { ComponentProps } from 'react';

vi.mock('@/features/feature-flags', () => ({ useFlags: () => ({}) }));
vi.mock('@/ui/hooks/create-break-point', () => ({ useDefaultBreakpoint: () => 'l' }));

function selectors(
  activity: ComponentProps<typeof ActivityAndTypeSelectors>['activity'],
  entityType: ComponentProps<typeof ActivityAndTypeSelectors>['entityType']
) {
  render(
    <ActivityAndTypeSelectors
      activity={activity}
      entityType={entityType}
      onActivityChange={vi.fn()}
      onEntityTypeChange={vi.fn()}
      onAllSelect={vi.fn()}
    />
  );
}

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
});
