'use client';

import { ExplorerAtlas } from '@/features/brain-atlas-viewer/explorer/explorer-atlas';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { cn } from '@/utils/css-class';

export type MiniBrainAtlasViewerGltfProps = {
  atlasId: string;
  regionId: string;
  regionName?: string;
  className?: string;
  onLoading?: (loading: boolean) => void;
  /** how large the brain is drawn: 1.6 by default, nearly the canvas's height */
  cameraZoom?: number;
  /** the colour the canvas clears to; navy by default */
  backgroundColor?: string;
};

/** One species' whole brain, small, as the explorer draws it (a species card, the mini atlas's row of them). */
export function MiniBrainAtlasViewerGltf({
  atlasId,
  className,
  onLoading,
  cameraZoom,
  backgroundColor = '#002766',
}: MiniBrainAtlasViewerGltfProps) {
  const { runtimeHierarchies } = useHierarchyRuntimeMetadataQuery();
  const hierarchy = runtimeHierarchies.find((h) => h.atlasId === atlasId);
  const {
    result: { root },
  } = useBrainRegionRootHierarchyQuery({ hId: hierarchy?.id });

  return (
    <ExplorerAtlas
      compact
      taxonomyId={hierarchy?.species.taxonomyId}
      atlasId={atlasId}
      // the workspace's root stands in until the species' own hierarchy is known
      root={hierarchy ? root : null}
      onLoading={onLoading}
      zoom={cameraZoom}
      clear={backgroundColor}
      className={cn(className, 'h-full w-full')}
    />
  );
}
