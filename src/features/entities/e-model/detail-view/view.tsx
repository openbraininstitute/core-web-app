'use client';

import { Suspense } from 'react';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';

import Analysis from '@/features/entities/e-model/detail-view/analysis';
import Configuration from '@/features/entities/e-model/detail-view/configuration';
import Simulation from '@/features/entities/e-model/detail-view/simulation';
import If from '@/components/ConditionalRenderer/If';
import Summary from '@/components/explore-section/details-view/summary';
import { DataType } from '@/constants/explore-section/list-views';

type Props = {
  params: {
    id: string;
    projectId: string;
    virtualLabId: string;
  };
};

export default function EModelDetailView({ params }: Props) {
  const { activeTab } = useTabs();

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary dataType={DataType.CircuitEModel}>
        {() => (
          <>
            <Tabs />
            <div className="w-full flex-1">
              <Suspense fallback={<CentralLoadingSpinner />}>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration params={params} />
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
