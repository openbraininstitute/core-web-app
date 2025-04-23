'use client';

import { Suspense, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import Link from 'next/link';

import Configuration from '@/features/entities/me-model/detail-view/configuration';
import Simulation from '@/features/entities/me-model/detail-view/simulation';
import Analysis from '@/features/entities/me-model/detail-view/analysis';

import {
  DataType,
  DataTypeToNewSimulationPage,
  DataTypeToNexusType,
} from '@/constants/explore-section/list-views';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import If from '@/components/ConditionalRenderer/If';

import useResourceInfoFromPath from '@/hooks/useResourceInfoFromPath';
import { initializeSummaryAtom } from '@/state/virtual-lab/build/me-model-setter';

import Summary from '@/components/explore-section/details-view/summary';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64 } from '@/util/common';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs/model';
import { ModelTypeNames } from '@/entity-configuration/domain/model';
import { IMEModel } from '@/api/entitycore/types/entities/me-model';
import MorphologyOverviewCard from '../card-viewers/morphology-overview-card';
import EModelOverviewCard from '../card-viewers/emodel-overview-card';

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
