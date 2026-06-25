'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { IcRound3dRotation } from '@/components/icons/IcRound3dRotation';
import { Loader } from '@/components/loader';
import {
  AtlasKindDict,
  hasMountedSpeciesAtlasPreview,
  markSpeciesAtlasPreviewMounted,
  type SpeciesAtlasPreviewSource,
} from '@/features/brain-atlas-viewer/all-species/helpers';
import { MiniBrainAtlasViewerGltf } from '@/features/brain-atlas-viewer/mini-brain-atlas-viewer-gltf';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { cn } from '@/utils/css-class';

type SpeciesAtlasPreviewProps = {
  hierarchyId: string;
  preview: SpeciesAtlasPreviewSource;
  regionName?: string;
  speciesName: string;
};

function SpeciesAtlasImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain p-6"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  );
}

function SpeciesAtlasGltfPreview({
  hierarchyId,
  preview,
  regionName,
  speciesName,
}: {
  hierarchyId: string;
  preview: Extract<SpeciesAtlasPreviewSource, { kind: typeof AtlasKindDict.Atlas }>;
  regionName?: string;
  speciesName: string;
}) {
  const {
    result: { root },
    loading,
  } = useBrainRegionRootHierarchyQuery({ hId: hierarchyId });

  const fallback = preview.fallbackImageSrc ? (
    <SpeciesAtlasImage src={preview.fallbackImageSrc} alt={speciesName} />
  ) : (
    <div className="flex h-full items-center justify-center">
      <Loader className="text-neutral-3" />
    </div>
  );

  if (loading || !root) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="text-neutral-3" />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={fallback}>
      <MiniBrainAtlasViewerGltf
        atlasId={preview.atlasId}
        regionId={root.id}
        regionName={regionName}
      />
    </ErrorBoundary>
  );
}

function AtlasPreviewContent({
  hierarchyId,
  preview,
  regionName,
  speciesName,
}: SpeciesAtlasPreviewProps) {
  if (preview.kind === AtlasKindDict.Image) {
    return <SpeciesAtlasImage src={preview.imageSrc} alt={speciesName} />;
  }

  return (
    <SpeciesAtlasGltfPreview
      hierarchyId={hierarchyId}
      preview={preview}
      regionName={regionName}
      speciesName={speciesName}
    />
  );
}

export function SpeciesAtlasPreview({
  hierarchyId,
  preview,
  regionName,
  speciesName,
}: SpeciesAtlasPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(() => hasMountedSpeciesAtlasPreview(hierarchyId));

  useEffect(() => {
    if (hasMountedSpeciesAtlasPreview(hierarchyId)) {
      setIsVisible(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markSpeciesAtlasPreviewMounted(hierarchyId);
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hierarchyId]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-primary-9"
    >
      {preview.kind === AtlasKindDict.Atlas && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full',
            'bg-[radial-gradient(circle_at_32%_28%,#ffffff_0%,#f5f7fa_42%,#d8dee8_100%)]',
            'shadow-[0_3px_8px_rgba(0,12,30,0.35),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-4px_8px_rgba(0,12,30,0.14)]',
            'ring-1 ring-white/70'
          )}
        >
          <IcRound3dRotation className="size-4.5 text-primary-9" />
        </div>
      )}
      {isVisible ? (
        <AtlasPreviewContent
          hierarchyId={hierarchyId}
          preview={preview}
          regionName={regionName}
          speciesName={speciesName}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader className="text-neutral-3" />
        </div>
      )}
    </div>
  );
}
