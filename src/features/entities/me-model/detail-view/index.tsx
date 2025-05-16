'use client';

import { useSetAtom } from 'jotai';
import { Suspense } from 'react';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Configuration from '@/features/entities/me-model/detail-view/configuration';
import Simulation from '@/features/entities/me-model/detail-view/simulation';
import Analysis from '@/features/entities/me-model/detail-view/analysis';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import Summary from '@/features/details-view/summary';
import If from '@/components/ConditionalRenderer/If';

import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { initializeSummaryAtom } from '@/state/virtual-lab/build/me-model-setter';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { DataType } from '@/constants/explore-section/list-views';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import { WorkspaceContext } from '@/types/common';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { resolveExperimentUrl } from '@/utils/url-builder';

type Params = WorkspaceContext & {
  id: string;
};

export type Props = {
  params: Params;
  showViewMode?: boolean;
  payload: {
    source: IMEModel;
  };
};

type TabsKeys = 'configuration' | 'analysis' | 'simulation';
const TabsConfig: Array<{ key: TabsKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'analysis', title: 'Analysis' },
  { key: 'simulation', title: 'Simulation' },
];

export default function SummaryView({ showViewMode = false, payload: { source } }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { activeTab } = useTabs({ tabsConfig: TabsConfig });
  const setInitializeSummary = useSetAtom(initializeSummaryAtom);

  // useEffect(() => {
  //   if (!id) return;
  //   setInitializeSummary(id, org, project);
  // }, [setInitializeSummary, id, org, project]);

  // const getSimulationId = (meModelId: string) => {
  //   const vlProjectUrl = generateVlProjectUrl(params.virtualLabId, params.projectId);
  //   const basePath = `${vlProjectUrl}/simulate/${DataTypeToNewSimulationPage[DataTypeToNexusType.CircuitMEModel]}/new`;
  //   return `${basePath}/${to64(`${params.projectId}!/!${meModelId}`)}`;
  // };

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary
        payload={source}
        dataType={DataType.CircuitMEModel}
        commonFields={CommonSummaryViewFields}
        showViewMode={showViewMode}
        extraHeaderAction={
          virtualLabId &&
          projectId && (
            <Link
              className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
              href={resolveExperimentUrl({
                ctx: { virtualLabId, projectId },
                dataType: EntityTypeEnum.Memodel,
                entityId: source.id,
              })}
            >
              Simulate
            </Link>
          )
        }
      >
        {() => (
          <>
            <Tabs tabsConfig={TabsConfig} />
            <div className="w-full flex-1">
              <Suspense fallback={<CentralLoadingSpinner />}>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration model={source} />
                </If>
                <If id="analysis" condition={activeTab === 'analysis'}>
                  <Analysis />
                </If>
                <If id="simulation" condition={activeTab === 'simulation'}>
                  <Simulation modelId={source.id} type={EntitySlug.SingleNeuronSimulation} />
                </If>
              </Suspense>
            </div>
            {/* Hiding button SfN */}
            {/* <GenericButton
              text="New model"
              className="fixed bottom-10 right-10 w-[200px] bg-primary-9 font-bold text-white hover:bg-primary-7!"
              href={`${vlProjectUrl}/build/me-model/new`}
            /> */}
          </>
        )}
      </Summary>
    </Suspense>
  );
}
