import { useSearchParams } from 'next/navigation';
import { kebabCase } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { match } from 'ts-pattern';
import { useMemo } from 'react';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { BrowseLink } from '@/ui/segments/explore/browse-link';
import { useTabs } from '@/components/detail-view-tabs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useFlags } from '@/features/feature-flags';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useGetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { WorkspaceContext } from '@/types/common';
import { WorkspaceScope } from '@/constants';
import {
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
  SimulationEntitiesTileTypes,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';
import { ROOT_ROUTE } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TWorkspaceScope } from '@/constants';

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

function buildUrl({
  virtualLabId,
  projectId,
  extendedType,
}: WorkspaceContext & { extendedType: TExtendedEntitiesTypeDict }) {
  return `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(extendedType)}`;
}

export function EntityLinkCount() {
  const featureFlags = useFlags();

  const breakpoint = useDefaultBreakpoint();
  const scope = (useSearchParams().get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;

  const { virtualLabId, projectId } = useWorkspace();
  const { selectedBrainRegion } = useGetSelectedBrainRegion();
  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );

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
      experimental.map((value) => {
        const link = buildUrl({ virtualLabId, projectId, extendedType: value.extendedType });
        return (
          <BrowseLink
            enabled
            key={`link-${value.title}/${value.type}`}
            href={link}
            scope={scope}
            extendedType={value.extendedType}
            currentBrainRegionId={selectedBrainRegion?.id}
            defaultBrainRegionId={brainRegionHierarchy?.root.id}
          />
        );
      })
    )
    .with(ExploreDataTypeTabs.Models, () =>
      models.map((value) => {
        const link = buildUrl({ virtualLabId, projectId, extendedType: value.extendedType });
        return (
          <BrowseLink
            enabled
            key={`link-${value.title}/${value.type}`}
            href={link}
            extendedType={value.extendedType}
            scope={scope}
            currentBrainRegionId={selectedBrainRegion?.id}
            defaultBrainRegionId={brainRegionHierarchy?.root.id}
          />
        );
      })
    )
    .with(ExploreDataTypeTabs.Simulations, () =>
      simulations.map((value) => {
        const link = buildUrl({ virtualLabId, projectId, extendedType: value.extendedType });
        return (
          <BrowseLink
            enabled={scope === WorkspaceScope.Project}
            key={`link-${value.title}/${value.type}`}
            href={link}
            scope={scope}
            extendedType={value.extendedType}
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
