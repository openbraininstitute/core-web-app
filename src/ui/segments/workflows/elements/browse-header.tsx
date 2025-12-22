'use client';

import { getDropdownOptionsByCategory } from '@/ui/segments/workflows/elements/helpers';
import {
  CategorySelectScrollable,
  EntityTypeSelectScrollable,
} from '@/ui/segments/workflows/elements/selectors';
import { useFlags } from '@/features/feature-flags';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

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

// const tabsConfigItems: Array<{
//   key: WorkflowScopeKeys;
//   title: string;
// }> = [
//   {
//     key: WorkflowScope.Public,
//     title: 'Public',
//   },
//   {
//     key: WorkflowScope.Project,
//     title: 'Project',
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
  const featureFlags = useFlags();

  const handleActivitySelect = (v: TActivityValue | null) => {
    onActivityChange(v);
    if (v) {
      const type =
        getDropdownOptionsByCategory(v, featureFlags).enabledOptions.at(0)?.options.at(0)?.value ??
        null;
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
