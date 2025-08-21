'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import snakeCase from 'lodash/snakeCase';
import kebabCase from 'lodash/kebabCase';

import {
  CategorySelectScrollable,
  EntityTypeSelectScrollable,
} from '@/ui/segments/workflows/elements/selectors';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { getWorkflowSegment } from '@/ui/segments/workflows/elements/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useTabs } from '@/components/detail-view-tabs';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TCategoryValue } from '@/ui/segments/workflows/elements/helpers';
import type { KebabCase } from '@/utils/type';

const WorkflowScope = {
  Public: 'public',
  Project: 'project',
} as const;

export type WorkflowScopeKeys = (typeof WorkflowScope)[keyof typeof WorkflowScope];

const tabsConfigItems: Array<{
  key: WorkflowScopeKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: WorkflowScope.Public,
    title: 'Public',
    position: 'first',
  },
  {
    key: WorkflowScope.Project,
    title: 'Project',
    position: 'last',
  },
];

function WorkflowScopeTabs() {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs({
    tabsConfig: tabsConfigItems,
    clearOnDefault: false,
    defaultKey: WorkflowScope.Public,
    shallow: true,
    tabKey: 'scope',
  });

  const onTabClick = (value: string) => onChangeTab(value)();

  return (
    <PillTabs
      value={activeTab ?? WorkflowScope.Public}
      className="w-full"
      activationMode="manual"
      onValueChange={onTabClick}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-2 bg-white p-0 shadow-2xl', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            position={tab.position}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
              { 'h-12': breakpoint === 'xl' }
            )}
          >
            {tab.title}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}

function WorkflowMenu() {
  const pathname = usePathname();
  const navigate = useRouter().push;
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const segment = getWorkflowSegment(pathname);

  const [{ category, entityType }, updateWorkflowState] = useState<{
    category: TCategoryValue | undefined;
    entityType: TExtendedEntitiesTypeDict | undefined;
  }>({
    category: segment ?? undefined,
    entityType: (snakeCase(type) as TExtendedEntitiesTypeDict) ?? undefined,
  });

  const onCategorySelect = (v: TCategoryValue | undefined) =>
    updateWorkflowState({ category: v, entityType: undefined });

  const onEntityTypeSelect = (v: TExtendedEntitiesTypeDict | undefined) => {
    updateWorkflowState((prev) => ({ ...prev, entityType: v }));
    navigate(
      `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/workflows/${category}/browse/${kebabCase(v)}`
    );
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex items-center justify-center gap-2">
        Category
        <CategorySelectScrollable value={category} onSelect={onCategorySelect} />
      </div>
      <div className="flex items-center justify-center gap-2">
        Type
        <EntityTypeSelectScrollable
          category={category}
          value={entityType}
          onSelect={onEntityTypeSelect}
        />
      </div>
    </div>
  );
}

export function Header() {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="border-neutral-2 rounded-full border py-1 pr-1 pl-4">
        <WorkflowMenu />
      </div>
      <div className="max-w-max">
        <WorkflowScopeTabs />
      </div>
    </div>
  );
}
