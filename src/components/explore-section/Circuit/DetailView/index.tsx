'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';

import { MEModelConfiguration } from '@/components/build-section/virtual-lab/synaptome/view-model/MEModelConfig';
import {
    MODEL_DATA_COMMON_FIELDS,
    SYNATOME_MODEL_FIELDS,
} from '@/constants/explore-section/detail-views-fields';
import { SynaptomeModelResource } from '@/types/explore-section/delta-model';
import { classNames } from '@/util/utils';

import SynapseGroupList from '@/components/build-section/virtual-lab/synaptome/view-model/ListSynapses';
import Results from '@/components/build-section/virtual-lab/synaptome/view-model/Results';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Detail from '@/components/explore-section/Detail';
import useResourceInfoFromPath from '@/hooks/useResourceInfoFromPath';

type Props = {
  params: {
    projectId: string;
    virtualLabId: string;
  };
};

type TabKeys = 'circuit-configuration' | 'circuit-simulation';
type Tab = { key: TabKeys; title: string };

const TABS: Tab[] = [
  {
    key: 'circuit-configuration',
    title: 'Configuration',
  },
  {
    key: 'circuit-simulation',
    title: 'Simulation',
  },
];

export default function CircuitModelDetailPage({ params: { virtualLabId, projectId } }: Props) {
  const info = useResourceInfoFromPath();
  const [activeTab, setActiveTab] = useState<TabKeys>('circuit-configuration');

//   const { model, configuration, loading } = useSynaptomeModel({
//     modelId: info.id,
//     virtualLabId,
//     projectId,
//   });

//   if (loading || !model || !configuration) {
//     return (
//       <div className="flex h-screen w-full flex-col items-center justify-center gap-3">
//         <Spin indicator={<LoadingOutlined />} size="large" />
//         <h2 className="font-light text-primary-9">Loading circuit model...</h2>
//       </div>
//     );
//   }

//   const getSimulationId = (synaptomeModelId: string) => {
//     const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
//     const basePath = `${vlProjectUrl}/simulate/${DataTypeToNewSimulationPage[DataTypeToNexusType.SingleNeuronSynaptome]}/new`;
//     return `${basePath}/${to64(`${projectId}!/!${synaptomeModelId}`)}`;
//   };

  return (
    <div className="secondary-scrollbar h-screen w-full overflow-y-auto">
      <Suspense fallback={<CentralLoadingSpinner />}>
        <Detail
          showViewMode
          fields={SYNATOME_MODEL_FIELDS}
          commonFields={MODEL_DATA_COMMON_FIELDS}
          extraHeaderAction={
            model && (
              <Link
                className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
                href={getSimulationId(model['@id'])}
              >
                Simulate
              </Link>
            )
          }
        >
          {(data: SynaptomeModelResource) => {
            return (
              <div>
                <ul className="mt-8 flex w-full items-center justify-center">
                  {TABS.map(({ key, title }) => (
                    <li
                      title={title}
                      key={key}
                      className={classNames(
                        'w-1/3 flex-[1_1_33%] border py-3 text-center text-xl font-semibold transition-all duration-200 ease-out',
                        activeTab === key ? 'bg-primary-9 text-white' : 'bg-white text-primary-9'
                      )}
                    >
                      <button
                        type="button"
                        className="w-full"
                        onClick={() => setActiveTab(key)}
                        onKeyDown={() => setActiveTab(key)}
                      >
                        {title}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 w-full">
                  {activeTab === 'synaptome-configuration' && (
                    <div className="flex w-full flex-col gap-4">
                      {data.linkedMeModel && data.linkedMModel && data.linkedEModel && (
                        <MEModelConfiguration
                          {...{
                            virtualLabId,
                            projectId,
                            meModel: data.linkedMeModel,
                            mModel: data.linkedMModel,
                            eModel: data.linkedEModel,
                          }}
                        />
                      )}
                      <div className="mt-10">
                        <SynapseGroupList modelUrl={data.distribution.contentUrl} />
                      </div>
                    </div>
                  )}
                  {activeTab === 'synaptome-simulation' && (
                    <Results params={{ virtualLabId, projectId }} modelId={info.id} />
                  )}
                </div>
              </div>
            );
          }}
        </Detail>
      </Suspense>
    </div>
  );
}
