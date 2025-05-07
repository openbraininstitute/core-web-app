'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';

import SelectedBrainRegionMETypes from '@/components/explore-section/ExploreInteractive/SelectedBrainRegionMETypes';
import DataTypeTabs from '@/components/explore-section/ExploreInteractive/DataTypeTabs';
import ThreeDeeBrain from '@/components/ThreeDeeBrain';

import EntityTypeStatsPanelContainer, {
  EntityTypeStatsPanel,
} from '@/components/entities-type-stats/panel';
import { EntityTypeCountSkeleton } from '@/components/entities-type-stats/stat-item';
import { withErrorConfig } from '@/components/GenericErrorFallback';

import type { BulkEntityCoreCountResult } from '@/app/api/entity-core/entities/count/route';
import type { Result } from '@/api/utils';

type Props = {
  entityCounterPromise: Promise<Result<BulkEntityCoreCountResult, Error>>;
};

export default function ExploreInteractivePanel({ entityCounterPromise }: Props) {
  return (
    <div className="relative flex h-full min-w-0 flex-1 overflow-hidden">
      <div className="relative h-full min-w-0 flex-1 overflow-hidden bg-[#012766]">
        <div
          id="interactive-layout"
          className="grid h-full grid-cols-[repeat(4,1fr)] grid-rows-[80px_repeat(4,1fr)_minmax(80px,max-content)] gap-y-4"
        >
          <div id="interactive-header" style={{ gridArea: '1 / 1 / 2 / 6' }}>
            <DataTypeTabs />
          </div>
          <div
            id="neurons-panel"
            className="relative mr-2 ml-4 rounded-md"
            style={{ gridArea: '2 / 1 / 6 / 3' }}
          >
            <SelectedBrainRegionMETypes />
          </div>
          <div
            id="3d-area"
            className="3d relative mr-4 ml-2 h-full rounded-md border border-[#0250b3] p-1"
            style={{ gridArea: '2 / 3 / 6 / 6' }}
          >
            <ThreeDeeBrain />
          </div>
          <div id="statistic-panel" style={{ gridArea: '6 / 1 / 7 / 5' }}>
            <ErrorBoundary
              FallbackComponent={withErrorConfig({
                customError: 'failed to load statistics for different entities',
                showButtons: false,
              })}
            >
              <Suspense
                fallback={
                  <div className="relative grid h-full grid-flow-row grid-cols-2 gap-x-3 gap-y-1 p-4 pt-0">
                    {Array.from({ length: 6 })
                      .fill(0)
                      .map((v, i) => (
                        <EntityTypeCountSkeleton key={`skeleton-${i}`} />
                      ))}
                  </div>
                }
              >
                <EntityTypeStatsPanelContainer entityCounterPromise={entityCounterPromise}>
                  {({ data, error, pathName, selectedTab }) => (
                    <EntityTypeStatsPanel {...{ data, error, pathName, selectedTab }} />
                  )}
                </EntityTypeStatsPanelContainer>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
