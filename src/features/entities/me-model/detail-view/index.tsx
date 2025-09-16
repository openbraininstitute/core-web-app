'use client';

import { Suspense } from 'react';

import Configuration from '@/features/entities/me-model/detail-view/configuration';
import Simulation from '@/features/entities/me-model/detail-view/simulation';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import Analysis from '@/features/model-analysis/explorer';
import Summary from '@/features/details-view/summary';
import If from '@/components/ConditionalRenderer/If';

import { useClearClientStorageCacheByKey } from '@/features/model-analysis/viewer/storage';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { DataType } from '@/constants/explore-section/list-views';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export type Props = {
  showViewMode?: boolean;
  payload: {
    source: IMEModel;
  };
};

type TabsKeys = 'configuration' | 'analysis' | 'experiments';
const TabsConfig: Array<{ key: TabsKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'analysis', title: 'Analysis' },
  { key: 'experiments', title: 'Experiments' },
];

const CommonSummaryViewFields = [
  { field: EntityCoreFields.Description, className: 'col-span-3' },
  { field: EntityCoreFields.CreatedBy },
  { field: EntityCoreFields.CreationDate },
] as TypeSummaryProps[];

export default function SummaryView({ showViewMode = false, payload: { source } }: Props) {
  const { activeTab } = useTabs({ tabsConfig: TabsConfig, shallow: true });
  useClearClientStorageCacheByKey();

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary
        payload={source}
        dataType={DataType.CircuitMEModel}
        commonFields={CommonSummaryViewFields}
        showViewMode={showViewMode}
      >
        {() => (
          <>
            <Tabs shallow tabsConfig={TabsConfig} />
            <div className="w-full flex-1">
              <Suspense>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration model={source} />
                </If>
                <If id="analysis" condition={activeTab === 'analysis'}>
                  <Analysis />
                </If>
                <If id="simulation" condition={activeTab === 'experiments'}>
                  <Simulation modelId={source.id} type={EntitySlug.SingleNeuronSimulation} />
                </If>
              </Suspense>
            </div>
          </>
        )}
      </Summary>
    </Suspense>
  );
}
