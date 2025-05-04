'use client';

import { Suspense } from 'react';
import Link from 'next/link';

import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';
import Results from '@/features/entities/single-neuron-synaptome/detail-view/elements/simulation-results';
import Summary from '@/features/details-view/summary';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';

import Configuration from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import { DataType } from '@/constants/explore-section/list-views';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import { resolveExperimentUrl } from '@/utils/url-builder';
import If from '@/components/ConditionalRenderer/If';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext & { id: string };
  memodel: IMEModel;
  config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  } | null;
  showViewMode?: boolean;
};

type TabKeys = 'configuration' | 'simulation';
const TabsConfig: Array<{ key: TabKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'simulation', title: 'Simulation' },
];

export default function Page({ params: { virtualLabId, projectId, id }, memodel, config }: Props) {
  const { activeTab } = useTabs({ tabsConfig: TabsConfig });
  return (
    <div className="secondary-scrollbar h-screen w-full overflow-y-auto">
      <Suspense fallback={<CentralLoadingSpinner />}>
        <Summary
          showViewMode
          dataType={DataType.SingleNeuronSynaptome}
          commonFields={CommonSummaryViewFields}
          extraHeaderAction={
            virtualLabId &&
            projectId && (
              <Link
                className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
                href={resolveExperimentUrl({
                  ctx: { virtualLabId, projectId },
                  dataType: EntityTypeEnum.SingleNeuronSynaptome,
                  entityId: id,
                })}
              >
                Simulate
              </Link>
            )
          }
        >
          {(data) => {
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
                        }}
                      />
                      <div className="mt-10">
                        <SynapseGroupList config={config} />
                      </div>
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
