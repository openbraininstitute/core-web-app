'use client';

import Image from 'next/image';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { Loader } from '@/components/loader';
import { BrainAtlasViewerGltf } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf';
import { FullScreen } from '@/features/brain-atlas-viewer/full-screen';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { SPECIES_IMAGE_MAP, SPECIES_TAXONOMY_IDS } from '@/features/brain-region-hierarchy/types';

export function AtlasViewer({ children }: { children?: ReactNode }) {
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

  const renderViewer = useMemo(
    () => (
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-primary-9/40' },
          customError: 'Failed to show 3D brain atlas visualization',
          showButtons: false,
        })}
      >
        <BrainAtlasViewerGltf onLoading={setIsLoading} />
      </ErrorBoundary>
    ),
    []
  );

  if (!hasAtlas) {
    return (
      <div className="@container relative flex h-full max-h-full w-full max-w-full flex-col items-center justify-center">
        {speciesImage ? (
          <Image
            src={speciesImage}
            alt={hierarchyMeta?.species.name ?? 'Species'}
            fill
            className="object-contain p-8"
            priority
          />
        ) : (
          <p className="text-white text-lg font-semibold">
            No 3D atlas nor an image available for this species.
          </p>
        )}
      </div>
    );
  }

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-9999 bg-black">
        <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/5">
            <Loader className="text-neutral-3" />
          </div>
        )}
        <div className="relative h-full w-full">{renderViewer}</div>
      </div>
    );
  }

  return (
    <div className="@container relative flex h-full max-h-full w-full max-w-full flex-col items-start lg:flex-row">
      <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />

      <div className="relative h-1/2 w-full min-w-0 rounded-2xl lg:h-full lg:min-h-0 lg:flex-2">
        {isLoading && (
          <div className="bg-primary-9/40 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
            <Loader className="text-neutral-3" />
          </div>
        )}
        {renderViewer}
      </div>

      {isMouse && (
        <div className="relative h-1/2 w-full min-w-0 animate-fade-in lg:h-full lg:min-h-0 lg:flex-1">
          {children}
        </div>
      )}
    </div>
  );
}

export default AtlasViewer;
