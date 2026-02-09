'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import {
  AppSpeciesBrainRegionConfig,
  getSpeciesConfigByHierarchyId,
  useBrainRegionRootHierarchyQuery,
} from '@/features/brain-region-hierarchy/context';
import { CellCompositionMETypeTree } from '@/features/cell-composition/elements/m-e-type-tree';

export function CellCompositionExplorer() {
  const {
    result: { workspaceHierarchyId },
  } = useBrainRegionRootHierarchyQuery();
  const speciesConfig = getSpeciesConfigByHierarchyId(workspaceHierarchyId);

  if (speciesConfig.name !== AppSpeciesBrainRegionConfig.Mouse.name) {
    return null;
  }

  return (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        customError: 'failed to load cell composition',
        showButtons: false,
      })}
    >
      <div className="absolute top-0 right-0 flex h-full w-full flex-col gap-2 px-4 py-4 text-white">
        <CellCompositionMETypeTree />
      </div>
    </ErrorBoundary>
  );
}

export default CellCompositionExplorer;
