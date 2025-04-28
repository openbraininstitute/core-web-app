'use client';

import { Suspense } from 'react';
import { useSetAtom } from 'jotai';

import Configuration from '@/features/entities/me-model/detail-view/configuration';
import Simulation from '@/features/entities/me-model/detail-view/simulation';
import Analysis from '@/features/entities/me-model/detail-view/analysis';
import Summary from '@/features/details-view/summary';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import If from '@/components/ConditionalRenderer/If';

import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs/model';
import { initializeSummaryAtom } from '@/state/virtual-lab/build/me-model-setter';
import { ModelTypeNames } from '@/entity-configuration/domain/model';
import { DataType } from '@/constants/explore-section/list-views';
import Tabs, { useTabs } from '@/components/detail-view-tabs';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

type Params = {
  id: string;
  modelType: ModelTypeNames;
  projectId: string;
  virtualLabId: string;
};

type Props = {
  params: Params;
  showViewMode?: boolean;
};

export default function SummaryView({ params, showViewMode = false }: Props) {
  const { activeTab } = useTabs();

  const setInitializeSummary = useSetAtom(initializeSummaryAtom);
  // const { id, org, project } = useResourceInfoFromPath();

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
        dataType={DataType.CircuitMEModel}
        commonFields={CommonSummaryViewFields}
        showViewMode={showViewMode}
        // extraHeaderAction={
        //   id &&
        //   !showViewMode && (
        //     <Link
        //       className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
        //       href={getSimulationId(id)}
        //     >
        //       Simulate
        //     </Link>
        //   )
        // }
      >
        {(data) => (
          <>
            <Tabs />
            <div className="w-full flex-1">
              <Suspense fallback={<CentralLoadingSpinner />}>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration model={data as IMEModel} />
                </If>
                <If id="analysis" condition={activeTab === 'analysis'}>
                  <Analysis />
                </If>
                <If id="simulation" condition={activeTab === 'simulation'}>
                  <Simulation {...{ params }} />
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
