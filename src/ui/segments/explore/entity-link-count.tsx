import { useQueries } from '@tanstack/react-query';
import { match } from 'ts-pattern';
import { useMemo } from 'react';
import kebabCase from 'lodash/kebabCase';
import get from 'lodash/get';

import { useFilteredCircuits } from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useGetSelectedBrainRegion } from '@/features/brain-region-hierarchy/context';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { BrowseLink } from '@/ui/segments/explore/browse-link';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useTabs } from '@/components/detail-view-tabs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  getElectricalCellRecordingsCount,
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
  getAllEntitiesCount,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';

export const ExploreDataTypeTabs = {
  Experimental: 'experimental',
  Models: 'models',
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
    position: 'last',
  },
];

type Props = {
  dataKey: string;
};

export function EntityLinkCount({ dataKey }: Props) {
  const breakpoint = useDefaultBreakpoint();

  const { virtualLabId, projectId } = useWorkspace();
  const { selectedBrainRegion } = useGetSelectedBrainRegion();
  const { activeTab, onChangeTab } = useTabs<TExploreDataTypeTabs>({
    tabsConfig: tabsConfigItems,
    tabKey: 'group',
    shallow: true,
  });

  const { filteredCircuits } = useFilteredCircuits({ dataKey });

  const params = {
    virtualLabId,
    projectId,
    brainRegionId: selectedBrainRegion?.id!,
  };

  const [{ isLoading: allLoading, data: allData }, { isLoading: ephysLoading, data: ephysData }] =
    useQueries({
      queries: [
        {
          queryKey: keyBuilder.dataCount({ ...params }),
          queryFn: () => getAllEntitiesCount({ ...params }),
          enabled: Boolean(selectedBrainRegion?.id),
        },
        {
          queryKey: keyBuilder.electricalCellRecordingsCount({ ...params }),
          queryFn: () =>
            getElectricalCellRecordingsCount({
              ...params,
            }),
          enabled: Boolean(selectedBrainRegion?.id),
        },
      ],
    });

  const experimentalState = useMemo(
    () => [
      ...Object.entries(ExperimentalEntitiesTileTypes).map(([, value]) => {
        if (value.type === EntityTypeDict.ElectricalCellRecording) {
          return { ...value, isLoading: ephysLoading };
        }
        return { ...value, isLoading: allLoading };
      }),
    ],
    [allLoading, ephysLoading]
  );

  const modelState = useMemo(
    () => [
      ...Object.entries(ModelEntitiesTileTypes).map(([, value]) => ({
        ...value,
        isLoading: allLoading,
      })),
    ],
    [allLoading]
  );

  const content = match(activeTab)
    .with(ExploreDataTypeTabs.Experimental, () => (
      <>
        {experimentalState.map((value) => {
          let count: number | null = get(allData, value.type, null);
          if (value.type === EntityTypeDict.ElectricalCellRecording) {
            count = ephysData?.pagination.total_items ?? null;
          }
          const link = `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/entity/${kebabCase(value.type)}`;
          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.type}
              title={value.title}
              count={count}
              isLoading={value.isLoading}
            />
          );
        })}
      </>
    ))
    .with(ExploreDataTypeTabs.Models, () => (
      <>
        {modelState.map((value) => {
          const count = get(allData, value.type, null);
          const link = `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/entity/${kebabCase(value.type)}`;
          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.type}
              title={value.title}
              count={count}
              isLoading={value.isLoading}
            />
          );
        })}
        <BrowseLink
          key="link-circuit"
          href={`${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/entity/${kebabCase('circuit')}`}
          type={ExtendedEntitiesTypeDict.Circuit}
          title="Circuit"
          count={filteredCircuits.count}
          isLoading={false}
        />
      </>
    ))
    .otherwise(() => null);

  return (
    <div className="px-4">
      <PillTabs
        value={activeTab ?? ExploreDataTypeTabs.Experimental}
        defaultValue={activeTab ?? ExploreDataTypeTabs.Experimental}
        className="w-full"
        activationMode="manual"
        onValueChange={(value) => {
          onChangeTab(value as TExploreDataTypeTabs)();
        }}
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
      <div className="my-4 flex w-full flex-col items-center justify-center gap-2">{content}</div>
    </div>
  );
}
