'use client';

import { useAtomValue } from 'jotai';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, ViewTransition } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Loader } from '@/components/loader';
import { config } from '@/config';
import { useAtlasViewer } from '@/features/brain-atlas-viewer/use-atlas-viewer';
import {
  speciesSelectionModeAtom,
  useBrainRegionRootHierarchyQuery,
} from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { SPECIES_IMAGE_MAP, SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { ATLAS_VIEW_TRANSITION } from '@/ui/segments/explore/atlas';
import { ATLAS_ZOOM, morphAtlasOnCompositor } from '@/ui/segments/explore/atlas-morph';
import { logError } from '@/utils/logger';

import type { ReactNode } from 'react';

/** The region's atlas beside the data table; `children` is its lower part, or stands alone. */
export function MiniAtlas({ children }: { children?: (inCard: boolean) => ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const viewer = useAtlasViewer();
  const { virtualLabId, projectId } = useWorkspace();
  const searchParams = useSearchParams();
  const isAllSpeciesMode = useAtomValue(speciesSelectionModeAtom) === SpeciesSelectionMode.All;
  const {
    result: { workspaceHierarchyId },
  } = useBrainRegionRootHierarchyQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();

  const hierarchyMeta = runtimeHierarchyById.get(workspaceHierarchyId);
  const taxonomyId = hierarchyMeta?.species.taxonomyId;
  const speciesImage = taxonomyId ? SPECIES_IMAGE_MAP[taxonomyId] : undefined;
  const hasAtlas = !!hierarchyMeta?.atlasId;

  if (isAllSpeciesMode || (!hasAtlas && !speciesImage)) return children?.(false) ?? null;

  const query = searchParams.toString();
  const atlasHref = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data${query ? `?${query}` : ''}`;
  const picture = speciesImage && (
    <Image
      src={speciesImage}
      alt={hierarchyMeta?.species.name ?? 'Species'}
      fill
      sizes="300px"
      className="object-contain p-3"
    />
  );

  return (
    <>
      <ViewTransition
        name={ATLAS_VIEW_TRANSITION}
        share="atlas-morph"
        default="none"
        onShare={(morph) =>
          morphAtlasOnCompositor(morph, { from: ATLAS_ZOOM.mini, to: ATLAS_ZOOM.full })
        }
      >
        <div
          id="mini-atlas"
          data-testid="mini-atlas"
          className="group bg-primary-9 relative mx-1 mt-1 h-40 shrink-0 overflow-hidden rounded-t-2xl [@media(max-height:760px)]:h-28"
        >
          {hasAtlas ? (
            <ErrorBoundary
              fallback={picture ?? null}
              onError={(error) => logError('Failed to show the mini 3D brain atlas', error)}
            >
              <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
                {viewer && (
                  <viewer.BrainAtlasViewerGltf
                    compact
                    className="h-full w-full"
                    onLoading={setIsLoading}
                  />
                )}
              </div>
              {isLoading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Loader className="text-neutral-3" />
                </div>
              )}
              <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-white/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Drag to rotate
              </span>
            </ErrorBoundary>
          ) : (
            picture
          )}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                href={atlasHref}
                data-testid="mini-atlas-open"
                aria-label="Open the 3D atlas"
                className="focus-visible:ring-primary-6 absolute top-2 left-2 flex size-8 items-center justify-center rounded-full bg-white/10 outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-white/20 focus-visible:ring-2 active:scale-[0.94]"
              >
                <Image src="/images/svg/atlas-expand.svg" alt="" width={14} height={14} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={6}>
              Open the 3D atlas
            </TooltipContent>
          </Tooltip>
        </div>
      </ViewTransition>
      {children?.(true)}
    </>
  );
}
