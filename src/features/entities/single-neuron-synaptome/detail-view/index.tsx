'use client';

import { Spin } from 'antd';
import { Suspense } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import Link from 'next/link';

import SynapseGroupList from '@/components/build-section/virtual-lab/synaptome/view-model/ListSynapses';
import useSynaptomeModel from '@/components/simulate/single-neuron/hooks/useSynaptomeModel';
import Results from '@/components/build-section/virtual-lab/synaptome/view-model/Results';
import Summary from '@/features/details-view/summary';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import useResourceInfoFromPath from '@/hooks/useResourceInfoFromPath';

import Configuration from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import {
  DataType,
  DataTypeToNewSimulationPage,
  DataTypeToNexusType,
} from '@/constants/explore-section/list-views';
import { to64 } from '@/util/common';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import If from '@/components/ConditionalRenderer/If';

import type { WorkspaceContext } from '@/types/common';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

type Props = {
  params: WorkspaceContext;
  mmodel: IReconstructionMorphology;
  emodel: IEModel;
  memodel: IMEModel;
  showViewMode?: boolean;
};

type TabKeys = 'configuration' | 'simulation';
const TabsConfig: Array<{ key: TabKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'simulation', title: 'Simulation' },
];

export default function Page({
  params: { virtualLabId, projectId },
  emodel,
  memodel,
  mmodel,
}: Props) {
  //   const info = useResourceInfoFromPath();
  const { activeTab } = useTabs({ tabsConfig: TabsConfig });

  //   const { model, configuration, loading } = useSynaptomeModel({
  //     modelId: info.id,
  //     virtualLabId,
  //     projectId,
  //   });

  //   if (loading || !model || !configuration) {
  //     return (
  //       <div className="flex h-screen w-full flex-col items-center justify-center gap-3">
  //         <Spin indicator={<LoadingOutlined />} size="large" />
  //         <h2 className="text-primary-9 font-light">Loading synaptome model...</h2>
  //       </div>
  //     );
  //   }

  const getSimulationId = (synaptomeModelId: string) => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const basePath = `${vlProjectUrl}/simulate/${DataTypeToNewSimulationPage[DataTypeToNexusType.SingleNeuronSynaptome]}/new`;
    return `${basePath}/${to64(`${projectId}!/!${synaptomeModelId}`)}`;
  };

  return (
    <div className="secondary-scrollbar h-screen w-full overflow-y-auto">
      <Suspense fallback={<CentralLoadingSpinner />}>
        <Summary
          showViewMode
          dataType={DataType.SingleNeuronSynaptome}
          commonFields={CommonSummaryViewFields}
          //   extraHeaderAction={
          //     model &&
          //     !showViewMode && (
          //       <Link
          //         className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
          //         href={getSimulationId(model['@id'])}
          //       >
          //         Simulate
          //       </Link>
          //     )
          //   }
        >
          {(data) => {
            console.log('ᦨ #  single-neuron-synaptome.tsx:68 #  Page #  data:', data);
            return (
              <div>
                <Tabs tabsConfig={TabsConfig} />
                <div className="mt-8 w-full">
                  <If id="configuration" condition={activeTab === 'configuration'}>
                    <div className="flex w-full flex-col gap-4">
                      <Configuration
                        {...{
                          virtualLabId,
                          projectId,
                          memodel,
                          emodel,
                          mmodel,
                        }}
                      />
                      {/* <div className="mt-10">
                        <SynapseGroupList modelUrl={data.distribution.contentUrl} />
                      </div> */}
                    </div>
                  </If>
                  {/* <If id="simulation" condition={activeTab === 'simulation'}>
                    <Results params={{ virtualLabId, projectId }} modelId={info.id} />
                  </If> */}
                </div>
              </div>
            );
          }}
        </Summary>
      </Suspense>
    </div>
  );
}
