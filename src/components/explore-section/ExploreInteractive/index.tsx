'use client';

import { ErrorBoundary } from 'react-error-boundary';

import SelectedBrainRegionMETypes from '@/components/explore-section/ExploreInteractive/SelectedBrainRegionMETypes';
import DataTypeTabs from '@/components/explore-section/ExploreInteractive/DataTypeTabs';
import EntityTypeStatsPanel from '@/components/entities-type-stats/panel';
import ThreeDeeBrain from '@/components/ThreeDeeBrain';

import { withErrorConfig } from '@/components/GenericErrorFallback';

export default function ExploreInteractivePanel() {
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
              <EntityTypeStatsPanel />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
