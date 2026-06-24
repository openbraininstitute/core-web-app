'use client';

import { useFlags } from '@/features/feature-flags';
import { listWorkflows } from '@/ui/segments/workflows/config';
import {
  CategorySelectScrollable,
  EntityTypeSelectScrollable,
} from '@/ui/segments/workflows/elements/selectors';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

const WorkflowScope = {
  Public: 'public',
  Project: 'project',
} as const;

export type WorkflowScopeKeys = (typeof WorkflowScope)[keyof typeof WorkflowScope];

interface WorkflowMenuProps {
  activity: TActivityValue | null;
  entityType: TExtendedEntitiesTypeDict | null;
  onActivityChange: (activity: TActivityValue | null) => void;
  onEntityTypeChange: (entityType: TExtendedEntitiesTypeDict | null) => void;
  onNavigate?: (entityType: TExtendedEntitiesTypeDict | null) => void;
}

export function ActivityAndTypeSelectors({
  activity,
  entityType,
  onActivityChange,
  onEntityTypeChange,
  onNavigate,
}: WorkflowMenuProps) {
  const featureFlags = useFlags();

  const handleActivitySelect = (v: TActivityValue | null) => {
    onActivityChange(v);
    if (v) {
      const type =
        listWorkflows({
          activity: v,
          flags: featureFlags,
          context: 'configure',
          sort: 'order',
        }).find((w) => !w.disabled)?.targetType ?? null;
      onEntityTypeChange(type);
      onNavigate?.(type);
    }
  };

  const handleEntityTypeSelect = (v: TExtendedEntitiesTypeDict | null) => {
    onEntityTypeChange(v);
    onNavigate?.(v);
  };

  return (
    <div
      id="workflow-category-and-type-selector"
      data-testid="workflow-category-and-type-selector"
      className="inline-flex w-full max-w-max items-center justify-start gap-2 px-2 py-2 select-none"
    >
      <div className="shadow-bnb flex items-center justify-center gap-2 rounded-full bg-white py-1 pr-1 pl-5">
        Category
        <CategorySelectScrollable value={activity} onSelect={handleActivitySelect} />
      </div>
      <div className="shadow-bnb flex items-center justify-center gap-2 rounded-full bg-white py-1 pr-1 pl-5">
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
