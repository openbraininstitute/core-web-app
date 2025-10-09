'use client';

import { Suspense, useState, useEffect } from 'react';

import RelatedPublications from '@/features/entities/circuit/elements/tabs-content/related-publications';
import { RelatedCircuits } from '@/ui/segments/explore/circuit/elements/related-circuits';
import Visualization from '@/features/entities/circuit/elements/tabs-content/visualization';
import Overview from '@/features/entities/circuit/elements/tabs-content/overview';
import DownloadPanel from '@/features/entities/circuit/elements/download-panel';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';
import If from '@/components/ConditionalRenderer/If';

import { makeCustomRowSelectionEvent } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import Tabs, { useTabs } from '@/components/detail-view-tabs';
import { classNames } from '@/util/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

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

function VisibilityWrapper({
  children,
  activeTab,
  tabKey,
}: {
  children: React.ReactNode;
  activeTab: TabsKeys | null;
  tabKey: TabsKeys;
}) {
  if (!activeTab) return null;

  return (
    <div
      className={classNames(
        'w-full transition-opacity duration-100',
        activeTab === tabKey
          ? 'relative top-auto right-auto left-auto h-auto overflow-visible opacity-100'
          : 'pointer-events-none absolute top-0 right-0 left-0 h-0 overflow-hidden opacity-0'
      )}
    >
      {children}
    </div>
  );
}

export default function DetailView({ payload }: Props) {
  const { activeTab } = useTabs({ tabsConfig: TabsConfig, shallow: true });
  const [visitedTabs, setVisitedTabs] = useState<Set<TabsKeys>>(new Set([activeTab as TabsKeys]));

  useEffect(() => {
    setVisitedTabs((prev) => new Set([...prev, activeTab as TabsKeys]));
  }, [activeTab]);

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary
        dataType={ExtendedEntitiesTypeDict.Circuit}
        payload={payload}
        commonFields={[{ field: EntityCoreFields.Description, className: 'col-span-3' }]}
        fieldsClassName="grid w-1/2 auto-rows-2 grid-cols-3 gap-x-8 gap-y-6"
        actions={{
          onDownload: () => makeCustomRowSelectionEvent({ record: payload }),
        }}
      >
        {() => {
          return (
            <div className="mt-10">
              <Tabs shallow tabsConfig={TabsConfig} />
              <div className="relative w-full flex-1">
                <Suspense fallback={<CentralLoadingSpinner />}>
                  <div className="relative">
                    <If id="visualization-tab" condition={visitedTabs.has('visualization')}>
                      <VisibilityWrapper activeTab={activeTab} tabKey="visualization">
                        <Visualization circuit={payload} />
                      </VisibilityWrapper>
                    </If>

                    <If id="overview-tab" condition={visitedTabs.has('overview')}>
                      <VisibilityWrapper activeTab={activeTab} tabKey="overview">
                        <Overview circuit={payload} />
                      </VisibilityWrapper>
                    </If>

                    <If
                      id="related-publications-tab"
                      condition={visitedTabs.has('related_publications')}
                    >
                      <VisibilityWrapper activeTab={activeTab} tabKey="related_publications">
                        <RelatedPublications circuit={payload} />
                      </VisibilityWrapper>
                    </If>

                    <If id="related-circuits-tab" condition={visitedTabs.has('related_circuits')}>
                      <VisibilityWrapper activeTab={activeTab} tabKey="related_circuits">
                        <Suspense
                          fallback={
                            <div className="h-full min-h-96 w-full bg-red-200">loading ...</div>
                          }
                        >
                          <RelatedCircuits circuit={payload} />
                        </Suspense>
                      </VisibilityWrapper>
                    </If>
                  </div>
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
