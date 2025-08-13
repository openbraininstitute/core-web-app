'use client';

import { Suspense } from 'react';
import isNil from 'lodash/isNil';
import Link from 'next/link';

import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';
import Configuration from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import Results from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import Summary from '@/features/details-view/summary';
import If from '@/components/ConditionalRenderer/If';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { resolveExperimentUrl } from '@/utils/url-builder';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { IMEModel, ISingleNeuronSynaptome } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext & { id: string };
  // eslint-disable-next-line react/no-unused-prop-types
  showViewMode?: boolean;
  payload: {
    source: ISingleNeuronSynaptome;
    memodel: IMEModel;
    config: {
      synapses: Array<TSingleNeuronSynaptomeConfiguration>;
    } | null;
  };
};

type TabKeys = 'configuration' | 'experiments';
const TabsConfig: Array<{ key: TabKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'experiments', title: 'Experiments' },
];

const CommonSummaryViewFields = [
  { field: EntityCoreFields.Description, className: 'col-span-3' },
  { field: EntityCoreFields.CreatedBy },
  { field: EntityCoreFields.CreationDate },
] as TypeSummaryProps[];

export default function Page({
  params: { virtualLabId, projectId, id },
  payload: { config, memodel, source },
}: Props) {
  const { activeTab } = useTabs({ tabsConfig: TabsConfig });
  return (
    <div className="secondary-scrollbar h-screen w-full overflow-y-auto">
      <Suspense fallback={<CentralLoadingSpinner />}>
        <Summary
          payload={source}
          showViewMode
          dataType={ExtendedEntitiesTypeDict.SingleNeuronSynaptome}
          commonFields={CommonSummaryViewFields}
          extraHeaderAction={
            virtualLabId &&
            projectId && (
              <Link
                className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
                href={resolveExperimentUrl({
                  ctx: { virtualLabId, projectId },
                  dataType: EntityTypeDict.SingleNeuronSynaptome,
                  entityId: id,
                })}
              >
                Simulate
              </Link>
            )
          }
        >
          {() => {
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
                      {!isNil(config) && (
                        <div className="mt-10">
                          <SynapseGroupList config={config} />
                        </div>
                      )}
                    </div>
                  </If>
                  <If id="simulation" condition={activeTab === 'experiments'}>
                    <Results
                      type={EntitySlug.SingleNeuronSynaptomeSimulation}
                      modelId={source.id}
                    />
                  </If>
                </div>
              </div>
            );
          }}
        </Summary>
      </Suspense>
    </div>
  );
}
