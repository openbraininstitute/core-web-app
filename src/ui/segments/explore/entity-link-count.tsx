import { map } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';

import { useTabs } from '@/components/detail-view-tabs';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';
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
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
  SimulationEntitiesTileTypes,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';

export const ExploreDataTypeTabs = {
  Experimental: 'experimental',
  Models: 'models',
  Simulations: 'simulations',
} as const;
export type TExploreDataTypeTabs = (typeof ExploreDataTypeTabs)[keyof typeof ExploreDataTypeTabs];

export const tabsConfigItems: Array<{
  key: TExploreDataTypeTabs;
  title: string;
}> = [
  {
    key: ExploreDataTypeTabs.Experimental,
    title: 'Experimental',
  },
  {
    key: ExploreDataTypeTabs.Models,
    title: 'Model',
  },
  {
    key: ExploreDataTypeTabs.Simulations,
    title: 'Simulations',
  },
];

export function EntityLinkCount() {
  const featureFlags = useFlags();
  const breakpoint = useDefaultBreakpoint();
  const { workspaceHierarchyId } = useWorkspaceHierarchyRegistry();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;

  const { selectedBrainRegion } = useGetSelectedBrainRegion();
  const scope = (useSearchParams().get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;

  const { result: brainRegionHierarchy } = usePrimaryHierarchyOfCurrentSpeciesQuery();

  // in "all species" mode, drop the brain-region filters so every entity of each
  // type is counted (no species, no region scoping).
  const effectiveHierarchyId = isAllMode ? undefined : workspaceHierarchyId;
  const effectiveCurrentBrainRegionId = isAllMode ? undefined : selectedBrainRegion?.id;
  const effectiveDefaultBrainRegionId = isAllMode ? undefined : brainRegionHierarchy?.root.id;

  const { activeTab, onChangeTab } = useTabs<TExploreDataTypeTabs>({
    tabsConfig: tabsConfigItems,
    tabKey: 'group',
    shallow: true,
  });

  const experimental = Object.values(ExperimentalEntitiesTileTypes).filter(
    (config) =>
      !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
  );
  const models = Object.values(ModelEntitiesTileTypes).filter(
    (config) =>
      !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
  );
  const simulations = Object.values(SimulationEntitiesTileTypes).filter(
    (config) =>
      !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
  );

  const content = match(activeTab)
    .with(ExploreDataTypeTabs.Experimental, () =>
      map(experimental, (value) => (
        <BrowseLink
          enabled
          key={`link-${value.title}/${value.type}`}
          scope={scope}
          extendedType={value.extendedType}
          hierarchyId={effectiveHierarchyId}
          currentBrainRegionId={effectiveCurrentBrainRegionId}
          defaultBrainRegionId={effectiveDefaultBrainRegionId}
        />
      ))
    )
    .with(ExploreDataTypeTabs.Models, () =>
      map(models, (value) => {
        return (
          <BrowseLink
            enabled
            key={`link-${value.title}/${value.type}`}
            extendedType={value.extendedType}
            scope={scope}
            hierarchyId={effectiveHierarchyId}
            currentBrainRegionId={effectiveCurrentBrainRegionId}
            defaultBrainRegionId={effectiveDefaultBrainRegionId}
          />
        );
      })
    )
    .with(ExploreDataTypeTabs.Simulations, () =>
      map(simulations, (value) => {
        return (
          <BrowseLink
            enabled
            key={`link-${value.title}/${value.type}`}
            scope={scope}
            extendedType={value.extendedType}
            hierarchyId={effectiveHierarchyId}
            currentBrainRegionId={effectiveCurrentBrainRegionId}
            defaultBrainRegionId={effectiveDefaultBrainRegionId}
          />
        );
      })
    )
    .otherwise(() => null);

  return (
    <div id="data-type-items-container" data-testid="data-type-items-container" className="py-2">
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
            {tabsConfigItems.map((tab) => (
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
