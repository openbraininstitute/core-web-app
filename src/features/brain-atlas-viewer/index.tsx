'use client';

import { useAtomValue } from 'jotai';
import Image from 'next/image';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { Loader } from '@/components/loader';
import { AllSpeciesAtlasGrid } from '@/features/brain-atlas-viewer/all-species/all-species-atlas-grid';
import { BrainAtlasViewerGltf } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf';
import { FullScreen } from '@/features/brain-atlas-viewer/full-screen';
import {
  speciesSelectionModeAtom,
  useBrainRegionRootHierarchyQuery,
} from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import {
  SPECIES_IMAGE_MAP,
  SPECIES_TAXONOMY_IDS,
  SpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';
import { cn } from '@/utils/css-class';

function FocusedAtlasViewer({ children }: { children?: ReactNode }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const {
    result: { workspaceHierarchyId },
  } = useBrainRegionRootHierarchyQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();

  const hierarchyMeta = runtimeHierarchyById.get(workspaceHierarchyId);
  const taxonomyId = hierarchyMeta?.species.taxonomyId;
  const hasAtlas = !!hierarchyMeta?.atlasId;
  const isMouse = taxonomyId === SPECIES_TAXONOMY_IDS.MUS_MUSCULUS;
  const speciesImage = taxonomyId ? SPECIES_IMAGE_MAP[taxonomyId] : undefined;

  const handleFullScreenToggle = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  const atlasViewer = (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        cls: { container: 'bg-primary-9/40' },
        customError: 'Failed to show 3D brain atlas visualization',
        showButtons: false,
      })}
    >
      <div className="relative h-full min-h-0 w-full">
        <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary-9/40">
            <Loader className="text-neutral-3" />
          </div>
        )}
        <BrainAtlasViewerGltf className="h-full w-full" onLoading={setIsLoading} />
      </div>
    </ErrorBoundary>
  );

  if (!hasAtlas) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center p-8">
        {speciesImage ? (
          <Image
            src={speciesImage}
            alt={hierarchyMeta?.species.name ?? 'Species'}
            width={960}
            height={720}
            className="max-h-full max-w-full object-contain"
            priority
          />
        ) : (
          <p className="text-lg font-semibold text-white">
            No 3D atlas nor an image available for this species.
          </p>
        )}
      </div>
    );
  }

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-9999 bg-black">
        <div className="relative h-full w-full">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/5">
              <Loader className="text-neutral-3" />
            </div>
          )}
          <BrainAtlasViewerGltf className="h-full w-full" onLoading={setIsLoading} />
        </div>
      </div>
    );
  }

  if (!isMouse) {
    return <div className="h-full min-h-0 w-full">{atlasViewer}</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      <div className="relative h-1/2 min-h-0 w-full lg:h-full lg:min-h-0 lg:flex-2">
        {atlasViewer}
      </div>
      <div className="relative h-1/2 min-h-0 w-full lg:h-full lg:min-h-0 lg:flex-1">{children}</div>
    </div>
  );
}

export function AtlasViewer({ children }: { children?: ReactNode }) {
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllSpeciesMode = speciesSelectionMode === SpeciesSelectionMode.All;
  const [keepAllGridMounted, setKeepAllGridMounted] = useState(isAllSpeciesMode);

  useEffect(() => {
    if (isAllSpeciesMode) {
      setKeepAllGridMounted(true);
    }
  }, [isAllSpeciesMode]);

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-1">
      {keepAllGridMounted && (
        <div
          aria-hidden={!isAllSpeciesMode}
          className={cn(
            'col-start-1 row-start-1 h-full min-h-0 w-full overflow-y-auto overscroll-contain secondary-scrollbar',
            !isAllSpeciesMode && 'pointer-events-none invisible'
          )}
        >
          <AllSpeciesAtlasGrid />
        </div>
      )}
      {!isAllSpeciesMode && (
        <div className="col-start-1 row-start-1 h-full min-h-0 w-full overflow-hidden">
          <FocusedAtlasViewer>{children}</FocusedAtlasViewer>
        </div>
      )}
    </div>
  );
}

export default AtlasViewer;
