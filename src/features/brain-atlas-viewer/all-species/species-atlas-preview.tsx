'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Loader } from '@/components/loader';
import {
  hasMountedSpeciesAtlasPreview,
  markSpeciesAtlasPreviewMounted,
  type SpeciesAtlasPreviewSource,
} from '@/features/brain-atlas-viewer/all-species/helpers';
import { MiniBrainAtlasViewerGltf } from '@/features/brain-atlas-viewer/mini-brain-atlas-viewer-gltf';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';

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
  preview: Extract<SpeciesAtlasPreviewSource, { kind: 'atlas' }>;
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
  if (preview.kind === 'image') {
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
