'use client';

import { Suspense } from 'react';

import DownloadPanel from '@/features/entities/circuit/elements/download-panel';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';

import { DataType } from '@/constants/explore-section/list-views';

import { makeCustomRowSelectionEvent } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import Tabs, { useTabs } from '@/components/detail-view-tabs';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';
import If from '@/components/ConditionalRenderer/If';

type Props = {
  // eslint-disable-next-line react/no-unused-prop-types
  params: WorkspaceContext & {
    id: string;
  };
  payload: ICircuit;
};

type TabsKeys = 'visualization' | 'overview' | 'related_publications' | 'related_circuits';
const TabsConfig: Array<{ key: TabsKeys; title: string }> = [
  { key: 'visualization', title: 'Visualization' },
  { key: 'overview', title: 'Overview' },
  { key: 'related_publications', title: 'Related publications' },
  { key: 'related_circuits', title: 'Related circuits' },
];

export default function DetailView({ payload }: Props) {
  const { activeTab } = useTabs({ tabsConfig: TabsConfig, shallow: true });
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary
        dataType={DataType.Circuit}
        payload={payload}
        commonFields={[
          { field: EntityCoreFields.Description, className: 'col-span-3' },
          { field: EntityCoreFields.CreatedBy },
          { field: EntityCoreFields.CreationDate },
        ]}
        fieldsClassName="grid w-1/2 auto-rows-2 grid-cols-2 gap-x-8 gap-y-6"
        actions={{
          onDownload: () => makeCustomRowSelectionEvent({ record: payload }),
        }}
      >
        {() => {
          return (
            <div className="mt-10">
              <Tabs tabsConfig={TabsConfig} />
              <div className="w-full flex-1">
                <Suspense fallback={<CentralLoadingSpinner />}>
                  <If id="visualization" condition={activeTab === 'visualization'}>
                    <div></div>
                  </If>
                  <If id="overview" condition={activeTab === 'overview'}>
                    <div>Overview</div>
                  </If>
                  <If id="related_publications" condition={activeTab === 'related_publications'}>
                    <div>Related Publications</div>
                  </If>
                  <If id="related_circuits" condition={activeTab === 'related_circuits'}>
                    <div>Related Circuits</div>
                  </If>
                </Suspense>
              </div>
            </div>
          );
        }}
      </Summary>
      <DownloadPanel />
    </Suspense>
  );
}
