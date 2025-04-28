'use client';

import { Suspense } from 'react';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Tabs, { useTabs } from '@/components/detail-view-tabs';

import Configuration from '@/features/entities/e-model/detail-view/configuration';
import Simulation from '@/features/entities/e-model/detail-view/simulation';
import Analysis from '@/features/entities/e-model/detail-view/analysis';
import Summary from '@/features/details-view/summary';
import If from '@/components/ConditionalRenderer/If';
import { DataType } from '@/constants/explore-section/list-views';
import { IEModel } from '@/api/entitycore/types/entities/e-model';

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
        {(data) => (
          <>
            <Tabs />
            <div className="w-full flex-1">
              <Suspense fallback={<CentralLoadingSpinner />}>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration params={params} data={data as IEModel} />
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
