import { LoadingOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { match } from 'ts-pattern';
import get from 'lodash/get';

import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { getElectricalCellRecordings } from '@/api/entitycore/queries/experimental/electrical-cell-recording';
import { useFilteredCircuits } from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { getEntitiesCount } from '@/api/entitycore/queries/general/entity';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { useTabs } from '@/components/detail-view-tabs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { Button } from '@/ui/molecules/button';
import {
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
} from '@/ui/segments/explore/helpers';
import {
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  useGetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { cn } from '@/utils/css-class';

import type { WorkspaceContext } from '@/types/common';

function getAllEntitiesCount({
  virtualLabId,
  projectId,
  brainRegionId,
}: WorkspaceContext & { brainRegionId: string }) {
  return getEntitiesCount({
    context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
    types: [
      'experimental_synapses_per_connection',
      'experimental_neuron_density',
      'experimental_bouton_density',
      'reconstruction_morphology',
      'single_neuron_synaptome',
      'memodel',
      'emodel',
    ],
    brainRegion: {
      within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
      within_brain_region_brain_region_id: brainRegionId ?? null,
      within_brain_region_ascendants: false,
    },
  });
}

function getElectricalCellRecordingsCount({
  virtualLabId,
  projectId,
  brainRegionId,
}: WorkspaceContext & { brainRegionId: string }) {
  return getElectricalCellRecordings({
    withFacets: false,
    context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
    filters: {
      recording_origin: ElectricalRecordingOriginDictionary.InVitro,
      page: 1,
      page_size: 1,
      within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
      within_brain_region_brain_region_id: brainRegionId ?? null,
      within_brain_region_ascendants: false,
    },
  });
}

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

          return (
            <Button
              rounded
              key={`counter-${value.type}`}
              variant="outline"
              size="lg"
              className="group w-full"
            >
              <div className="flex w-full items-center justify-between">
                <div className="font-bold text-current">{value.title}</div>
                <div className="text-neutral-4 text-sm font-light group-hover:font-bold group-hover:text-white">
                  {value.isLoading ? <LoadingOutlined /> : <div>{count}</div>}
                </div>
              </div>
            </Button>
          );
        })}
      </>
    ))
    .with('model', () => (
      <>
        {modelState.map((value) => {
          const count = get(allData, value.type, null);

          return (
            <Button
              rounded
              key={`counter-${value.type}`}
              variant="outline"
              size="lg"
              className="group w-full"
            >
              <div className="flex w-full items-center justify-between">
                <div className="font-bold text-current">{value.title}</div>
                <div className="text-neutral-4 text-sm font-light group-hover:font-bold group-hover:text-white">
                  {value.isLoading ? <LoadingOutlined /> : <div>{count}</div>}
                </div>
              </div>
            </Button>
          );
        })}
        <Button rounded key="counter-circuit" variant="outline" size="lg" className="group w-full">
          <div className="flex w-full items-center justify-between">
            <div className="font-bold text-current">Circuit</div>
            <div className="text-neutral-4 text-sm font-light group-hover:font-bold group-hover:text-white">
              {filteredCircuits.count}
            </div>
          </div>
        </Button>
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
