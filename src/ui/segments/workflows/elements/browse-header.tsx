'use client';

import { useFlags } from '@/features/feature-flags';
import { listWorkflows } from '@/ui/segments/workflows/config';
import {
  CategorySelectScrollable,
  EntityTypeSelectScrollable,
} from '@/ui/segments/workflows/elements/selectors';
import { ALL_WORKFLOWS } from '@/ui/segments/workflows/elements/workflow-activity-all';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';
import type { TAllWorkflows } from '@/ui/segments/workflows/elements/workflow-activity-all';

const WorkflowScope = {
  Public: 'public',
  Project: 'project',
} as const;

export type WorkflowScopeKeys = (typeof WorkflowScope)[keyof typeof WorkflowScope];

interface WorkflowMenuProps {
  activity: TActivityValue | TAllWorkflows | null;
  entityType: TExtendedEntitiesTypeDict | TAllWorkflows | null;
  onActivityChange: (activity: TActivityValue | null) => void;
  onEntityTypeChange: (entityType: TExtendedEntitiesTypeDict | null) => void;
  onNavigate?: (entityType: TExtendedEntitiesTypeDict | null) => void;
  /**
   * Offers All / All first, every workflow's runs at once (legacy ones aside), and is called
   * instead of the two above when it is picked. Without it the menus hold no All.
   */
  onAllSelect?: () => void;
}

export function ActivityAndTypeSelectors({
  activity,
  entityType,
  onActivityChange,
  onEntityTypeChange,
  onNavigate,
  onAllSelect,
}: WorkflowMenuProps) {
  const featureFlags = useFlags();

  const handleActivitySelect = (v: TActivityValue | TAllWorkflows | null) => {
    if (v === ALL_WORKFLOWS) {
      onAllSelect?.();
      return;
    }
    onActivityChange(v);
    if (v) {
      const type =
        listWorkflows({
          activity: v,
          flags: featureFlags,
          context: 'browse',
          sort: 'order',
        }).find((w) => !w.disabled)?.targetType ?? null;
      onEntityTypeChange(type);
      onNavigate?.(type);
    }
  };

  const handleEntityTypeSelect = (v: TExtendedEntitiesTypeDict | TAllWorkflows | null) => {
    // the only type under All, so picking it changes nothing
    if (v === ALL_WORKFLOWS) return;
    onEntityTypeChange(v);
    onNavigate?.(v);
  };

  // `w-fit` rather than `w-full` + `max-w-max`; see the note in `selectors.tsx`
  return (
    <div
      id="workflow-category-and-type-selector"
      data-testid="workflow-category-and-type-selector"
      className="inline-flex w-fit items-center justify-start gap-2 px-2 py-2 select-none"
    >
      <div className="border-gray-90 shadow-sm flex items-center justify-center gap-2 rounded-full bg-white py-1 pr-1 pl-5">
        Category
        <CategorySelectScrollable
          value={activity}
          onSelect={handleActivitySelect}
          includeAll={Boolean(onAllSelect)}
        />
      </div>
      <div className="border-gray-90 shadow-sm flex items-center justify-center gap-2 rounded-full bg-white py-1 pr-1 pl-5">
        Type
        <EntityTypeSelectScrollable
          category={activity}
          value={entityType}
          onSelect={handleEntityTypeSelect}
        />
      </div>
    </div>
  );
}
