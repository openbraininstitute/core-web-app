import { useAtomValue } from 'jotai';
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
import { SegmentedTabs } from '@/ui/molecules/tabs/segmented-tabs';
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

const DATA_TYPE_SEGMENTS = DataSectionDataTypeTabsConfig.map((tab) => ({
  value: tab.key,
  label: tab.title,
  id: `data-type-tab-${tab.key}`,
  testId: `data-type-tab-${tab.key}`,
}));

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
    <div
      className={cn(
        'mx-1 mt-2 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/70 p-2',
        'bg-white/75 ring-1 ring-primary-9/5 backdrop-blur-xl backdrop-saturate-150',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_12px_-6px_rgb(0_39_102/0.08),0_1px_2px_rgb(0_39_102/0.04)]',
        '[@media(prefers-reduced-transparency:reduce)]:bg-white [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none'
      )}
    >
      <div
        id="data-type-tabs-container"
        data-testid="data-type-tabs-container"
        className="w-full shrink-0"
      >
        <SegmentedTabs
          id="data-type-selector"
          aria-label="Data type"
          value={selectedTab}
          onValueChange={(value) => onChangeTab(value as TExploreDataTypeTabs)()}
          segments={DATA_TYPE_SEGMENTS}
          segmentClassName="text-base xl:h-10"
        />
      </div>
      <div
        id="data-type-items-container"
        data-testid="data-type-items-container"
        className="secondary-scrollbar mt-2 -mr-2 flex min-h-0 flex-1 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto py-1 pr-0.5 [scrollbar-gutter:stable]"
      >
        {content}
      </div>
    </div>
  );
}
