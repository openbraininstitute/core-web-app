import { kebabCase, isNil, get } from 'es-toolkit/compat';
import { useQueries } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { match } from 'ts-pattern';
import { useMemo } from 'react';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { BrowseLink } from '@/ui/segments/explore/browse-link';
import { useTabs } from '@/components/detail-view-tabs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useGetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { WorkspaceScope } from '@/constants';
import {
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
  SimulationEntitiesTileTypes,
  getSimulationsCount,
  getAllEntitiesCountScoped,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';
import { ROOT_ROUTE } from '@/config';

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
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: ExploreDataTypeTabs.Experimental,
    title: 'Experimental',
    position: 'first',
  },
  {
    key: ExploreDataTypeTabs.Models,
    title: 'Model',
    position: 'middle',
  },
  {
    key: ExploreDataTypeTabs.Simulations,
    title: 'Simulations',
    position: 'last',
  },
];

export function EntityLinkCount() {
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

  const params = {
    virtualLabId,
    projectId,
    brainRegionId: selectedBrainRegion?.id!,
    scope,
  };

  const [
    { isLoading: allLoading, data: allData },
    { isLoading: simsLoading, data: simsData },
    { isLoading: rootLoading, data: rootData },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.dataCount({ ...params }),
        queryFn: () => getAllEntitiesCountScoped({ ...params }),
        enabled: Boolean(selectedBrainRegion?.id),
      },
      {
        queryKey: keyBuilder.userSimulationsCount({ ...params }),
        queryFn: () =>
          getSimulationsCount({
            ...params,
          }),
        enabled: Boolean(selectedBrainRegion?.id),
      },
      {
        queryKey: keyBuilder.dataCount({ ...params, brainRegionId: brainRegionHierarchy?.root.id }),
        queryFn: () =>
          getAllEntitiesCountScoped({ ...params, brainRegionId: brainRegionHierarchy?.root.id! }),
        enabled: Boolean(brainRegionHierarchy?.root.id),
      },
    ],
  });

  const experimentalState = useMemo(
    () => [
      ...Object.entries(ExperimentalEntitiesTileTypes).map(([, value]) => {
        return { ...value, isLoading: allLoading || rootLoading };
      }),
    ],
    [allLoading, rootLoading]
  );

  const modelState = useMemo(
    () => [
      ...Object.entries(ModelEntitiesTileTypes).map(([, value]) => ({
        ...value,
        isLoading: allLoading || rootLoading,
      })),
    ],
    [allLoading, rootLoading]
  );

  const simulationState = useMemo(
    () => [
      ...Object.entries(SimulationEntitiesTileTypes).map(([, value]) => ({
        ...value,
        isLoading: simsLoading,
      })),
    ],
    [simsLoading]
  );

  const content = match(activeTab)
    .with(ExploreDataTypeTabs.Experimental, () => (
      <>
        {experimentalState.map((value) => {
          const count: number | null = get(allData, value.extendedType, null);
          const rootCount: number | null = get(rootData, value.extendedType, null);
          const link = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(value.extendedType)}`;

          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.extendedType}
              title={value.title}
              count={
                <span className="flex items-center justify-center gap-1">
                  <span className="font-bold">{count}</span> <span className="font-light">of</span>
                  <span className="font-bold">{rootCount}</span>
                </span>
              }
              isLoading={value.isLoading || isNil(count) || isNil(rootCount)}
              isUploadable={value.isUploadable}
            />
          );
        })}
      </>
    ))
    .with(ExploreDataTypeTabs.Models, () => (
      <>
        {modelState.map((value) => {
          const count = get(allData, value.extendedType, null);
          const rootCount: number | null = get(rootData, value.extendedType, null);
          const link = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(value.extendedType)}`;
          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.extendedType}
              title={value.title}
              count={
                <span className="flex items-center justify-center gap-1">
                  <span className="font-bold">{count}</span> <span className="font-light">of</span>
                  <span className="font-bold">{rootCount}</span>
                </span>
              }
              isLoading={value.isLoading || isNil(count) || isNil(rootCount)}
              isUploadable={value.isUploadable}
            />
          );
        })}
      </>
    ))
    .with(ExploreDataTypeTabs.Simulations, () => (
      <>
        {simulationState.map((value) => {
          const count = get(simsData, value.extendedType, null);
          const link = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(value.extendedType)}`;

          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.extendedType}
              title={value.title}
              count={<span className="font-bold">{count}</span>}
              isLoading={value.isLoading || isNil(count)}
              isUploadable={value.isUploadable}
            />
          );
        })}
      </>
    ))
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
                position={tab.position}
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
