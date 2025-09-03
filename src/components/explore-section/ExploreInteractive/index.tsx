'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'next/navigation';

import EntityGroupTabs from '@/components/explore-section/ExploreInteractive/interactive/entity-group-tab';
import CellCompositionExplorer from '@/features/cell-composition/elements/cell-composition-explorer';
import EntityTypeStatsPanel from '@/components/entities-type-stats/interactive-navigation-menu';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { AtlasViewer } from '@/features/brain-atlas-viewer';
import { resolveDataKey } from '@/utils/key-builder';

import type { WorkspaceContext } from '@/types/common';

export default function ExploreInteractivePanel() {
  const { projectId } = useParams<WorkspaceContext>();
  const dataKey = resolveDataKey({ projectId, section: 'explore' });

  return (
    <div className="relative flex h-full w-full min-w-0 flex-1 overflow-hidden">
      <div className="bg-primary-9 relative h-full min-w-0 flex-1 overflow-hidden">
        <div
          id="interactive-layout"
          className="grid h-full grid-cols-[repeat(4,1fr)] grid-rows-[80px_repeat(4,1fr)_minmax(80px,max-content)] gap-y-4"
        >
          <div id="interactive-header" style={{ gridArea: '1 / 1 / 2 / 6' }}>
            <HydrateWrapper>
              <EntityGroupTabs dataKey={dataKey} />
            </HydrateWrapper>
          </div>
          <div
            id="neurons-panel"
            className="relative mr-2 ml-4 rounded-md"
            style={{ gridArea: '2 / 1 / 6 / 3' }}
          >
            <CellCompositionExplorer />
          </div>
          <div
            id="3d-area"
            className="3d border-primary-7 relative mr-4 ml-2 h-full rounded-md border p-1"
            style={{ gridArea: '2 / 3 / 6 / 6' }}
          >
            <AtlasViewer dataKey={dataKey} />
          </div>
          <div id="statistic-panel" style={{ gridArea: '6 / 1 / 7 / 5' }}>
            <ErrorBoundary
              FallbackComponent={withErrorConfig({
                customError: 'failed to load statistics for different entities',
                showButtons: false,
              })}
            >
              <EntityTypeStatsPanel dataKey={dataKey} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
