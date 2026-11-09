'use client';

import { useAtomValue } from 'jotai';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Loader } from '@/components/loader';
import { config } from '@/config';
import { MiniBrainAtlasViewerGltf } from '@/features/brain-atlas-viewer/mini-brain-atlas-viewer-gltf';
import { useAtlasViewer } from '@/features/brain-atlas-viewer/use-atlas-viewer';
import {
  speciesSelectionModeAtom,
  useBrainRegionRootHierarchyQuery,
} from '@/features/brain-region-hierarchy/context';
import { orderHierarchiesBySpeciesDisplayNames } from '@/features/brain-region-hierarchy/helpers';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { SPECIES_IMAGE_MAP, SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { CARD_EDGE_CLASS } from '@/features/data-grid/react/molecules-theme';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { AtlasMorph } from '@/ui/segments/explore/atlas';
import { cn } from '@/utils/css-class';
import { logError } from '@/utils/logger';

import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import type { SpeciesRuntimeHierarchy } from '@/features/brain-atlas-viewer/all-species/helpers';

/** The card holding the atlas and the selector under it, edged like the entity selector. */
const CARD_CLASS = `mx-1 mt-1 mb-1 shrink-0 rounded-3xl ${CARD_EDGE_CLASS}`;
/** The navy atlas box at the top of the card, shorter on short screens. */
const ATLAS_BOX_CLASS =
  'bg-primary-9 relative h-40 shrink-0 overflow-hidden rounded-t-3xl [@media(max-height:760px)]:h-28';

/** Back to the big atlas, with the same query. */
function AtlasExpandLink({ href }: { href: string }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          data-testid="mini-atlas-open"
          aria-label="Open the 3D atlas"
          className="focus-visible:ring-primary-6 absolute top-2 left-2 z-20 flex size-8 items-center justify-center rounded-full bg-white/10 outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-white/20 focus-visible:ring-2 active:scale-[0.94]"
        >
          <Image src="/images/svg/atlas-expand.svg" alt="" width={14} height={14} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>
        Open the 3D atlas
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One species' whole brain, fading in once drawn. Its canvas is two slots wide, so the
 * brain can turn without being cut off at its slot, and clears to black blended as
 * `screen`: black adds nothing, so overlapping canvases show the navy and each other.
 */
function SpeciesBrain({
  hierarchy,
  style,
  isActive,
}: {
  hierarchy: SpeciesRuntimeHierarchy;
  style: CSSProperties;
  isActive: boolean;
}) {
  const {
    result: { root },
  } = useBrainRegionRootHierarchyQuery({ hId: hierarchy.id });
  const [isDrawing, setIsDrawing] = useState(true);
  if (!root || !hierarchy.atlasId) return null;
  return (
    <div
      style={style}
      title={isActive ? hierarchy.species.displayName : undefined}
      className={cn(
        'absolute inset-y-0 mix-blend-screen',
        isActive ? 'z-10' : 'pointer-events-none'
      )}
    >
      <MiniBrainAtlasViewerGltf
        atlasId={hierarchy.atlasId}
        regionId={root.id}
        regionName={hierarchy.species.displayName}
        onLoading={setIsDrawing}
        backgroundColor="#000000"
        className={cn('transition-opacity duration-300', isDrawing ? 'opacity-0' : 'opacity-100')}
      />
    </div>
  );
}

/**
 * Every species with an atlas, in the order the big atlas lists them. The canvases
 * overlap, so the brain under the pointer is the one that takes a drag.
 */
function AllSpeciesBrains() {
  const { runtimeHierarchies } = useHierarchyRuntimeMetadataQuery();
  const withAtlas = useMemo(
    () => orderHierarchiesBySpeciesDisplayNames(runtimeHierarchies).filter((h) => h.atlasId),
    [runtimeHierarchies]
  );
  const [active, setActive] = useState(0);
  const slot = 100 / Math.max(withAtlas.length, 1);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // a drag keeps its brain until it ends
    if (event.buttons) return;
    const box = event.currentTarget.getBoundingClientRect();
    const at = Math.floor(((event.clientX - box.left) / box.width) * withAtlas.length);
    setActive(Math.min(Math.max(at, 0), withAtlas.length - 1));
  };

  return (
    <div className="absolute inset-0" onPointerMove={onPointerMove}>
      {withAtlas.map((hierarchy, i) => (
        <SpeciesBrain
          key={hierarchy.id}
          hierarchy={hierarchy}
          isActive={i === active}
          style={{ width: `${2 * slot}%`, left: `${(i - 0.5) * slot}%` }}
        />
      ))}
    </div>
  );
}

/** The region's atlas beside the data table; `children` is its lower part, or stands alone. */
export function MiniAtlas({ children }: { children?: (inCard: boolean) => ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const { viewer, error: viewerError } = useAtlasViewer();
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

  useEffect(() => {
    if (viewerError) logError('Failed to load the 3D brain atlas viewer', viewerError);
  }, [viewerError]);

  const query = searchParams.toString();
  const atlasHref = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data${query ? `?${query}` : ''}`;

  if (isAllSpeciesMode) {
    return (
      // with no species chosen, every species' brain side by side
      <div className={CARD_CLASS}>
        <div
          id="mini-atlas-all"
          data-testid="mini-atlas-all"
          className={cn(ATLAS_BOX_CLASS, 'isolate')}
        >
          <AllSpeciesBrains />
          <AtlasExpandLink href={atlasHref} />
        </div>
        {children?.(true)}
      </div>
    );
  }
  if (!hasAtlas && !speciesImage) return children?.(false) ?? null;
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
    <div className={CARD_CLASS}>
      <AtlasMorph view="mini">
        <div id="mini-atlas" data-testid="mini-atlas" className={cn(ATLAS_BOX_CLASS, 'group')}>
          {/* the picture stands in for a viewer that failed to load or to draw */}
          {hasAtlas && !viewerError ? (
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
          <AtlasExpandLink href={atlasHref} />
        </div>
      </AtlasMorph>
      {children?.(true)}
    </div>
  );
}
