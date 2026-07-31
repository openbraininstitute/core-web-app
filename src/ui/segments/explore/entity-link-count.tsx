import { useAtomValue } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';

import { useTabs } from '@/components/detail-view-tabs';
import { SCOPE_QUERY_PARAMS, type TWorkspaceScope, WorkspaceScope } from '@/constants';
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
  const scope = (useSearchParams().get(SCOPE_QUERY_PARAMS) ??
    WorkspaceScope.Public) as TWorkspaceScope;

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
    scope,
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
    <div className="py-2">
      <div id="data-type-tabs-container" data-testid="data-type-tabs-container" className="w-full">
        <PillTabs
          id="data-type-selector"
          data-testid="data-type-selector"
          value={activeTab ?? ExploreDataTypeTabs.Experimental}
          defaultValue={activeTab ?? ExploreDataTypeTabs.Experimental}
          className="w-full px-1"
          activationMode="manual"
          onValueChange={(value) => {
            onChangeTab(value as TExploreDataTypeTabs)();
          }}
        >
          <PillTabsList
            className={cn(
              'grid h-10 w-full grid-cols-3 bg-white p-0 shadow-sm border-gray-100 border',
              {
                'h-12': breakpoint === 'xl',
              }
            )}
          >
            {DataSectionDataTypeTabsConfig.map((tab) => (
              <PillTabsTrigger
                key={tab.key}
                value={tab.key}
                id={`data-type-tab-${tab.key}`}
                data-testid={`data-type-tab-${tab.key}`}
                className={cn(
                  'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none',
                  'data-[state=active]:font-bold data-[state=active]:text-white',
                  { 'h-12': breakpoint === 'xl' }
                )}
              >
                {tab.title}
              </PillTabsTrigger>
            ))}
          </PillTabsList>
        </PillTabs>
      </div>
      <div
        id="data-type-items-container"
        data-testid="data-type-items-container"
        className="mb-4 mt-2 flex w-full flex-col items-center justify-center gap-2 py-2"
      >
        {content}
      </div>
    </div>
  );
}
