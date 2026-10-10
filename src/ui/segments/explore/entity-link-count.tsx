import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { useId } from 'react';
import { match } from 'ts-pattern';

import { useTabs } from '@/components/detail-view-tabs';
import { DATA_SECTION_SCOPE, type TWorkspaceScope } from '@/constants';
import {
  speciesSelectionModeAtom,
  useGetSelectedBrainRegion,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { useFlags } from '@/features/feature-flags';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { BrowseLink } from '@/ui/segments/explore/browse-link';
import {
  BrowseExperimentalDataExtendedTypes,
  DataSectionDataTypeTabsConfig,
  ExploreDataTypeTabs,
  ModelDataExtendedTypes,
  SimulationDataExtendedTypes,
  type TExploreDataTypeTabs,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export { ExploreDataTypeTabs, type TExploreDataTypeTabs } from '@/ui/segments/explore/helpers';

/** The selected pill slides between groups on the same spring as `MotionTabs`. */
const TAB_SPRING = { type: 'spring', stiffness: 170, damping: 24, mass: 1.2 } as const;

type TBrowseLinkListEntity = {
  title: string;
  extendedType: TExtendedEntitiesTypeDict;
};

type TBrowseLinkListProps = {
  entities: TBrowseLinkListEntity[];
  scope: TWorkspaceScope;
  hierarchyId?: string;
  currentBrainRegionId?: string;
  defaultBrainRegionId?: string;
};

/**
 * One Data nav list. Render order is the key order of the registries in `explore/helpers.ts`,
 * which puts the superseded ("(legacy)") types last; `BrowseLink` dims those rows itself.
 */
function BrowseLinkList({
  entities,
  scope,
  hierarchyId,
  currentBrainRegionId,
  defaultBrainRegionId,
}: TBrowseLinkListProps) {
  return entities.map((entity) => (
    <BrowseLink
      enabled
      key={`link-${entity.title}/${entity.extendedType}`}
      scope={scope}
      extendedType={entity.extendedType}
      hierarchyId={hierarchyId}
      currentBrainRegionId={currentBrainRegionId}
      defaultBrainRegionId={defaultBrainRegionId}
    />
  ));
}

export function EntityLinkCount() {
  const featureFlags = useFlags();
  const breakpoint = useDefaultBreakpoint();
  const { workspaceHierarchyId } = useWorkspaceHierarchyRegistry();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;

  const { selectedBrainRegion } = useGetSelectedBrainRegion();

  const { result: brainRegionHierarchy } = usePrimaryHierarchyOfCurrentSpeciesQuery();

  // in "all species" mode, drop the brain-region filters so every entity of each
  // type is counted (no species, no region scoping).
  const effectiveHierarchyId = isAllMode ? undefined : workspaceHierarchyId;
  const effectiveCurrentBrainRegionId = isAllMode ? undefined : selectedBrainRegion?.id;
  const effectiveDefaultBrainRegionId = isAllMode ? undefined : brainRegionHierarchy?.root.id;

  const { activeTab, onChangeTab } = useTabs<TExploreDataTypeTabs>({
    tabsConfig: DataSectionDataTypeTabsConfig,
    tabKey: 'group',
    shallow: true,
  });
  const selectedTab = activeTab ?? ExploreDataTypeTabs.Experimental;
  const indicatorId = useId();

  const experimental = Object.values(BrowseExperimentalDataExtendedTypes).filter(
    (config) =>
      !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
  );
  const models = Object.values(ModelDataExtendedTypes).filter(
    (config) =>
      !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
  );
  const simulations = Object.values(SimulationDataExtendedTypes).filter(
    (config) =>
      !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
  );

  const listProps = {
    scope: DATA_SECTION_SCOPE,
    hierarchyId: effectiveHierarchyId,
    currentBrainRegionId: effectiveCurrentBrainRegionId,
    defaultBrainRegionId: effectiveDefaultBrainRegionId,
  };

  const content = match(activeTab)
    .with(ExploreDataTypeTabs.Experimental, () => (
      <BrowseLinkList entities={experimental} {...listProps} />
    ))
    .with(ExploreDataTypeTabs.Models, () => <BrowseLinkList entities={models} {...listProps} />)
    .with(ExploreDataTypeTabs.Simulations, () => (
      <BrowseLinkList entities={simulations} {...listProps} />
    ))
    .otherwise(() => null);

  return (
    <div className="border-primary-9/[0.06] bg-primary-9/[0.04] mx-1 mt-2 flex min-h-0 flex-1 flex-col rounded-3xl border p-2">
      <div
        id="data-type-tabs-container"
        data-testid="data-type-tabs-container"
        className="w-full shrink-0"
      >
        <PillTabs
          id="data-type-selector"
          data-testid="data-type-selector"
          value={selectedTab}
          defaultValue={selectedTab}
          className="w-full"
          activationMode="manual"
          onValueChange={(value) => {
            onChangeTab(value as TExploreDataTypeTabs)();
          }}
        >
          <PillTabsList
            className={cn(
              'grid h-10 w-full grid-cols-3 gap-1 border border-gray-100 bg-white p-1 shadow-sm',
              { 'h-12': breakpoint === 'xl' }
            )}
          >
            {DataSectionDataTypeTabsConfig.map((tab) => (
              <PillTabsTrigger
                key={tab.key}
                value={tab.key}
                id={`data-type-tab-${tab.key}`}
                data-testid={`data-type-tab-${tab.key}`}
                className={cn(
                  'text-primary-8 hover:bg-neutral-1 hover:text-primary-9 relative h-full rounded-full px-2 py-0 text-base transition-colors select-none',
                  'data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-none',
                  'focus-visible:ring-primary-6 focus-visible:ring-offset-0'
                )}
              >
                {selectedTab === tab.key && (
                  <motion.span
                    layoutId={indicatorId}
                    transition={TAB_SPRING}
                    className="bg-primary-9 absolute inset-0 rounded-full shadow-[0_2px_8px_rgba(0,39,102,0.25)]"
                  />
                )}
                <span className="relative">{tab.title}</span>
              </PillTabsTrigger>
            ))}
          </PillTabsList>
        </PillTabs>
      </div>
      {/* rtl moves the scrollbar to the left edge; the items themselves stay ltr */}
      <div
        id="data-type-items-container"
        data-testid="data-type-items-container"
        className="secondary-scrollbar mt-2 flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto py-1 [direction:rtl] *:[direction:ltr]"
      >
        {content}
      </div>
    </div>
  );
}
