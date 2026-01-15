import { map } from 'es-toolkit/compat';
import { useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';

import { useTabs } from '@/components/detail-view-tabs';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';
import {
  useGetSelectedBrainRegion,
  usePrimaryHierarchySpeciesQuery,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
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

  const { selectedBrainRegion } = useGetSelectedBrainRegion();
  const scope = (useSearchParams().get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;

  const { result: brainRegionHierarchy } = usePrimaryHierarchySpeciesQuery();

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
          hierarchyId={workspaceHierarchyId}
          currentBrainRegionId={selectedBrainRegion?.id}
          defaultBrainRegionId={brainRegionHierarchy?.root.id}
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
            hierarchyId={workspaceHierarchyId}
            currentBrainRegionId={selectedBrainRegion?.id}
            defaultBrainRegionId={brainRegionHierarchy?.root.id}
          />
        );
      })
    )
    .with(ExploreDataTypeTabs.Simulations, () =>
      map(simulations, (value) => {
        return (
          <BrowseLink
            enabled={scope === WorkspaceScope.Project}
            key={`link-${value.title}/${value.type}`}
            scope={scope}
            extendedType={value.extendedType}
            hierarchyId={workspaceHierarchyId}
            currentBrainRegionId={selectedBrainRegion?.id}
            defaultBrainRegionId={brainRegionHierarchy?.root.id}
          />
        );
      })
    )
    .otherwise(() => null);

  return (
    <div className="px-2 py-2">
      <div className="w-full px-2">
        <PillTabs
          id="data-type-selector"
          data-testid="data-type-selector"
          value={activeTab ?? ExploreDataTypeTabs.Experimental}
          defaultValue={activeTab ?? ExploreDataTypeTabs.Experimental}
          className="w-full"
          activationMode="manual"
          onValueChange={(value) => {
            onChangeTab(value as TExploreDataTypeTabs)();
          }}
        >
          <PillTabsList
            className={cn('grid h-10 w-full grid-cols-3 bg-white p-0 shadow-2xl', {
              'h-12': breakpoint === 'xl',
            })}
          >
            {tabsConfigItems.map((tab) => (
              <PillTabsTrigger
                key={tab.key}
                value={tab.key}
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
        className="my-4 flex w-full flex-col items-center justify-center gap-2 px-2 py-2"
      >
        {content}
      </div>
    </div>
  );
}
