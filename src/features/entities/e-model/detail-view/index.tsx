'use client';

import { Suspense } from 'react';

import Configuration from '@/features/entities/e-model/detail-view/configuration';
import Simulation from '@/features/entities/e-model/detail-view/simulation';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import Analysis from '@/features/model-analysis/explorer';
import Summary from '@/features/details-view/summary';
import If from '@/components/ConditionalRenderer/If';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ICellMorphology, IEModel } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

export type Props = {
  payload: {
    source: IEModel;
    exemplar_morphology: ICellMorphology;
  };
  params: WorkspaceContext & {
    id: string;
  };
};

type TabsKeys = 'configuration' | 'analysis' | 'simulation';
const TabsConfig: Array<{ key: TabsKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'analysis', title: 'Analysis' },
  { key: 'simulation', title: 'Simulation' },
];

export default function EModelDetailView({ payload, params }: Props) {
  const { activeTab } = useTabs({ tabsConfig: TabsConfig, shallow: true });

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary dataType={ExtendedEntitiesTypeDict.Emodel} payload={payload.source}>
        {() => (
          <>
            <Tabs shallow tabsConfig={TabsConfig} />
            <div className="w-full flex-1">
              <Suspense fallback={<CentralLoadingSpinner />}>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration params={params} payload={payload} />
                </If>
                <If id="analysis" condition={activeTab === 'analysis'}>
                  <Analysis />
                </If>
                <If id="simulation" condition={activeTab === 'simulation'}>
                  <Simulation />
                </If>
              </Suspense>
            </div>
          </>
        )}
      </Summary>
    </Suspense>
  );
}
