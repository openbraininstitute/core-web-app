'use client';

import { useParams, usePathname } from 'next/navigation';
import { useRouter } from '@bprogress/next/app';
import { useState } from 'react';
import snakeCase from 'lodash/snakeCase';
import kebabCase from 'lodash/kebabCase';

import {
  CategorySelectScrollable,
  EntityTypeSelectScrollable,
} from '@/ui/segments/workflows/elements/selectors';
import { getWorkflowSegment } from '@/ui/segments/workflows/elements/helpers';
import { ROOT_ROUTE } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';
import type { KebabCase } from '@/utils/type';

const WorkflowScope = {
  Public: 'public',
  Project: 'project',
} as const;

export type WorkflowScopeKeys = (typeof WorkflowScope)[keyof typeof WorkflowScope];

interface WorkflowMenuProps {
  activity: TActivityValue | undefined;
  entityType: TExtendedEntitiesTypeDict | undefined;
  onActivityChange: (activity: TActivityValue | undefined) => void;
  onEntityTypeChange: (entityType: TExtendedEntitiesTypeDict | undefined) => void;
  onNavigate?: (entityType: TExtendedEntitiesTypeDict | undefined) => void;
}

// const tabsConfigItems: Array<{
//   key: WorkflowScopeKeys;
//   title: string;
//   position: 'first' | 'middle' | 'last';
// }> = [
//   {
//     key: WorkflowScope.Public,
//     title: 'Public',
//     position: 'first',
//   },
//   {
//     key: WorkflowScope.Project,
//     title: 'Project',
//     position: 'last',
//   },
// ];

// function WorkflowScopeTabs() {
//   const breakpoint = useDefaultBreakpoint();
//   const { activeTab, onChangeTab } = useTabs({
//     tabsConfig: tabsConfigItems,
//     clearOnDefault: false,
//     defaultKey: WorkflowScope.Public,
//     shallow: true,
//     tabKey: 'scope',
//   });

//   const onTabClick = (value: string) => onChangeTab(value)();

//   return (
//     <PillTabs
//       value={activeTab ?? WorkflowScope.Public}
//       className="w-full"
//       activationMode="manual"
//       onValueChange={onTabClick}
//     >
//       <PillTabsList
//         className={cn('grid h-10 w-full grid-cols-2 bg-white p-0 shadow-2xl', {
//           'h-12': breakpoint === 'xl',
//         })}
//       >
//         {tabsConfigItems.map((tab) => (
//           <PillTabsTrigger
//             key={tab.key}
//             value={tab.key}
//             position={tab.position}
//             className={cn(
//               'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
//               { 'h-12': breakpoint === 'xl' }
//             )}
//           >
//             {tab.title}
//           </PillTabsTrigger>
//         ))}
//       </PillTabsList>
//     </PillTabs>
//   );
// }

export function ActivityAndTypeSelectors({
  activity,
  entityType,
  onActivityChange,
  onEntityTypeChange,
  onNavigate,
}: WorkflowMenuProps) {
  const handleActivitySelect = (v: TActivityValue | undefined) => {
    onActivityChange(v);
    onEntityTypeChange(undefined);
  };

  const handleEntityTypeSelect = (v: TExtendedEntitiesTypeDict | undefined) => {
    onEntityTypeChange(v);
    onNavigate?.(v);
  };

  return (
    <div
      id="workflow-category-selector"
      data-testid="workflow-category-selector"
      className="inline-flex w-full max-w-max items-center justify-start gap-2 px-2 py-2"
    >
      <div id="workflow-category-content" className="flex items-center justify-center gap-2">
        Category
        <CategorySelectScrollable value={activity} onSelect={handleActivitySelect} />
      </div>
      <div className="flex items-center justify-center gap-2">
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

function WorkflowSelectMenu() {
  const pathname = usePathname();
  const navigate = useRouter().push;
  const segment = getWorkflowSegment(pathname);
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();

  const [{ activity, entityType }, updateWorkflowState] = useState<{
    activity: TActivityValue | undefined;
    entityType: TExtendedEntitiesTypeDict | undefined;
  }>({
    activity: segment ?? undefined,
    entityType: (snakeCase(type) as TExtendedEntitiesTypeDict) ?? undefined,
  });

  const handleActivityChange = (v: TActivityValue | undefined) =>
    updateWorkflowState({ activity: v, entityType: undefined });

  const handleEntityTypeChange = (v: TExtendedEntitiesTypeDict | undefined) => {
    updateWorkflowState((prev) => ({ ...prev, entityType: v }));
  };

  const handleNavigate = (v: TExtendedEntitiesTypeDict | undefined) => {
    if (v && activity) {
      navigate(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/browse/${kebabCase(v)}`,
        {
          showProgress: true,
          disableSameURL: true,
        }
      );
    }
  };

  return (
    <ActivityAndTypeSelectors
      activity={activity}
      entityType={entityType}
      onActivityChange={handleActivityChange}
      onEntityTypeChange={handleEntityTypeChange}
      onNavigate={handleNavigate}
    />
  );
}

export function Header() {
  return (
    <div className="flex w-full items-center justify-between">
      <div
        id="workflow-menu-category-type-selector"
        className="border-neutral-2 rounded-full border py-1 pr-1 pl-4"
      >
        <WorkflowSelectMenu />
      </div>
      {/* <div id="workflow-menu-scope" className="max-w-max">
        <WorkflowScopeTabs />
      </div> */}
    </div>
  );
}
