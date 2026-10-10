'use client';

import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Loader } from '@/components/loader';
import { config } from '@/config';
import {
  speciesSelectionModeAtom,
  useBrainRegionRootHierarchyQuery,
} from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { SPECIES_IMAGE_MAP, SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AtlasMorph, useAtlasMorphSource } from '@/ui/segments/explore/atlas-morph';
import { cn } from '@/utils/css-class';
import { logError } from '@/utils/logger';

import type { MouseEvent, PointerEvent, ReactNode } from 'react';

const BrainAtlasViewerGltf = dynamic(
  () =>
    import('@/features/brain-atlas-viewer/brain-atlas-viewer-gltf').then(
      (m) => m.BrainAtlasViewerGltf
    ),
  { ssr: false }
);

/** Pointer travel (px) beyond which a press is a rotation, not a click. */
const DRAG_THRESHOLD = 5;

/**
 * The selected region in a small card beside the data table. Drag rotates it and the
 * wheel zooms; a plain click opens the full 3D atlas. `children` renders under the atlas,
 * as the card's lower part, or on its own when there is no atlas to show.
 */
export function MiniAtlas({
  className,
  children,
}: {
  className?: string;
  children?: (inCard: boolean) => ReactNode;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  // "All species" has no single atlas to show.
  const isShown = !isAllSpeciesMode && (hasAtlas || !!speciesImage);
  useAtlasMorphSource(cardRef, isShown);

  if (!isShown) return children?.(false) ?? null;

  const query = searchParams.toString();
  const atlasHref = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data${query ? `?${query}` : ''}`;

  const onPointerDown = (e: PointerEvent) => {
    pressedAt.current = { x: e.clientX, y: e.clientY };
  };
  const onClick = (e: MouseEvent) => {
    // the expand link and the camera reset handle their own clicks
    if ((e.target as Element).closest('a, button')) return;
    const start = pressedAt.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) return;
    router.push(atlasHref);
  };

  return (
    <>
      <div
        className={cn(
          'flex shrink-0 flex-col rounded-[16px]',
          'shadow-[-16px_-16px_20px_0_rgba(255,255,255,0.82),5px_8px_45px_0_rgba(0,0,0,0.06)]',
          className
        )}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard users get the expand link */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users get the expand link */}
        <div
          ref={cardRef}
          id="mini-atlas"
          data-testid="mini-atlas"
          title="Drag to rotate, scroll to zoom, click to open the 3D atlas"
          // capture: the atlas canvas stops pointer events from bubbling
          onPointerDownCapture={onPointerDown}
          onClick={onClick}
          className={cn(
            'bg-primary-9 relative h-[170px] w-full cursor-pointer overflow-hidden',
            children ? 'rounded-t-[16px]' : 'rounded-[16px]',
            // inset, so the hover ring does not spill onto the part below
            'hover:ring-primary-6 transition-shadow hover:ring-2 hover:ring-inset'
          )}
        >
          {hasAtlas ? (
            <ErrorBoundary
              fallback={null}
              onError={(error) => logError('Failed to show the mini 3D brain atlas', error)}
            >
              <div className="absolute inset-0">
                <BrainAtlasViewerGltf compact className="h-full w-full" onLoading={setIsLoading} />
              </div>
              {isLoading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Loader className="text-neutral-3" />
                </div>
              )}
            </ErrorBoundary>
          ) : (
            speciesImage && (
              <Image
                src={speciesImage}
                alt={hierarchyMeta?.species.name ?? 'Species'}
                fill
                sizes="300px"
                className="object-contain p-[12px]"
              />
            )
          )}
          <Link
            href={atlasHref}
            data-testid="mini-atlas-open"
            aria-label="Open the 3D atlas"
            title="Open the 3D atlas"
            className="focus-visible:ring-primary-6 absolute top-[12px] left-[12px] flex rounded-sm outline-none focus-visible:ring-2"
          >
            <Image src="/images/svg/atlas-expand.svg" alt="" width={15} height={15} />
          </Link>
        </div>
        {children?.(true)}
      </div>
      {/* a sibling, so the card's ref is attached before its layout effect runs */}
      <AtlasMorph target={cardRef} />
    </>
  );
}
