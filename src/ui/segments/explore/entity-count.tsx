import { LoadingOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import { usePathname, useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';
import { useMemo } from 'react';

import snakeCase from 'lodash/snakeCase';
import kebabCase from 'lodash/kebabCase';
import Link from 'next/link';
import get from 'lodash/get';

import { useFilteredCircuits } from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useGetSelectedBrainRegion } from '@/features/brain-region-hierarchy/context';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useTabs } from '@/components/detail-view-tabs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { Button } from '@/ui/molecules/button';
import {
  getElectricalCellRecordingsCount,
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
  getEntityTypeFromUrl,
  getAllEntitiesCount,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';

const ExploreDataTypeTabs = {
  Experimental: 'experimental',
  Model: 'model',
} as const;
type TExploreDataTypeTabs = (typeof ExploreDataTypeTabs)[keyof typeof ExploreDataTypeTabs];

const tabsConfigItems: Array<{
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
    key: ExploreDataTypeTabs.Model,
    title: 'Model',
    position: 'last',
  },
];

type Props = {
  dataKey: string;
};

function BrowseLink({
  isLoading,
  type,
  title,
  count,
  href,
}: {
  isLoading: boolean;
  type: string;
  title: string;
  count: number | null;
  href: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const entityType = snakeCase(getEntityTypeFromUrl(pathname) ?? '');
  return (
    <Button
      asChild
      rounded
      key={`counter-${type}`}
      variant="outline"
      size="lg"
      className="group w-full"
      active={entityType === type}
    >
      <Link
        href={{
          pathname: href,
          query: searchParams.toString(),
        }}
        className="flex! w-full items-center justify-between!"
      >
        <div className="font-bold text-current">{title}</div>
        <div className="text-neutral-4 text-sm font-light group-hover:font-bold group-hover:text-white">
          {isLoading ? <LoadingOutlined /> : <div>{count}</div>}
        </div>
      </Link>
    </Button>
  );
}

export function EntityCount({ dataKey }: Props) {
  const breakpoint = useDefaultBreakpoint();

  const { virtualLabId, projectId } = useWorkspace();
  const { selectedBrainRegion } = useGetSelectedBrainRegion();
  const { activeTab, onChangeTab } = useTabs<TExploreDataTypeTabs>({
    tabsConfig: tabsConfigItems,
    tabKey: 'data-type',
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
    .with('experimental', () => (
      <>
        {experimentalState.map((value) => {
          let count: number | null = get(allData, value.type, null);
          if (value.type === EntityTypeDict.ElectricalCellRecording) {
            count = ephysData?.pagination.total_items ?? null;
          }
          const link = `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/${kebabCase(value.type)}`;
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
    .with('model', () => (
      <>
        {modelState.map((value) => {
          const count = get(allData, value.type, null);
          const link = `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/${kebabCase(value.type)}`;
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
          href={`${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/${kebabCase('circuit')}`}
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
        value={activeTab ?? 'all-public'}
        defaultValue={activeTab ?? 'all-public'}
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
