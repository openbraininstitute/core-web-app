'use client';

import { Suspense } from 'react';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

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
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { resolveExperimentUrl } from '@/utils/url-builder';
import { EntityTypeEnum } from '@/api/entitycore/types';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & {
  id: string;
};

export type Props = {
  // @FIXME: Is this property necessary?
  // eslint-disable-next-line react/no-unused-prop-types
  params: Params;
  showViewMode?: boolean;
  payload: {
    source: IMEModel;
  };
};

type TabsKeys = 'configuration' | 'analysis' | 'simulation';
const TabsConfig: Array<{ key: TabsKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'analysis', title: 'Analysis' },
  { key: 'simulation', title: 'Simulation' },
];

export const CommonSummaryViewFields = [
  { field: EntityCoreFields.Description, className: 'col-span-3' },
  { field: EntityCoreFields.CreatedBy },
  { field: EntityCoreFields.CreationDate },
] as TypeSummaryProps[];

export default function SummaryView({ showViewMode = false, payload: { source } }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { activeTab } = useTabs({ tabsConfig: TabsConfig });
  useClearClientStorageCacheByKey();

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary
        payload={source}
        dataType={DataType.CircuitMEModel}
        commonFields={CommonSummaryViewFields}
        showViewMode={showViewMode}
        extraHeaderAction={
          virtualLabId &&
          projectId && (
            <Link
              className="flex h-11 items-center gap-2 rounded-none border border-gray-300 px-8 shadow-none"
              href={resolveExperimentUrl({
                ctx: { virtualLabId, projectId },
                dataType: EntityTypeEnum.Memodel,
                entityId: source.id,
              })}
            >
              Simulate
            </Link>
          )
        }
      >
        {() => (
          <>
            <Tabs tabsConfig={TabsConfig} />
            <div className="w-full flex-1">
              <Suspense>
                <If id="configuration" condition={activeTab === 'configuration'}>
                  <Configuration model={source} />
                </If>
                <If id="analysis" condition={activeTab === 'analysis'}>
                  <Analysis />
                </If>
                <If id="simulation" condition={activeTab === 'simulation'}>
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
