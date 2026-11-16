import React from 'react';

import { ExplorerAtlas } from '@/features/brain-atlas-viewer/explorer/explorer-atlas';
import {
  useBrainRegionRootHierarchyQuery,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';

export interface BrainAtlasViewerGltfProps {
  className?: string;
  /** A small preview: the brain alone, without the explorer's controls. */
  compact?: boolean;
  onLoading(loading: boolean): void;
}

/**
 * The workspace species' brain in the explorer (the user asked for the atlas drawn as their Brain Explorer draws
 * it), the selected brain region focused; picking a part of the brain selects its region.
 */
export function BrainAtlasViewerGltf({ className, compact = false, onLoading }: BrainAtlasViewerGltfProps) {
  const {
    result: { workspaceHierarchyId, root, options },
  } = useBrainRegionRootHierarchyQuery();
  const { result: brainRegions } = usePrimaryHierarchyOfCurrentSpeciesQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();
  const { selectedBrainRegion, changeBrainRegion } = useWorkspaceHierarchyRegistry();
  const hierarchyMeta = runtimeHierarchyById.get(workspaceHierarchyId);

  const regionOf = React.useCallback(
    (id?: string | null) =>
      id
        ? (options?.find((o) => o.value === id)?.data ??
          brainRegions?.options.find((o) => o.value === id)?.data ??
          null)
        : null,
    [options, brainRegions]
  );

  return (
    <ExplorerAtlas
      taxonomyId={hierarchyMeta?.species.taxonomyId}
      atlasId={hierarchyMeta?.atlasId}
      root={root}
      selected={regionOf(selectedBrainRegion?.id)}
      onSelectRegion={(id) => {
        const region = regionOf(id);
        if (region) changeBrainRegion(region);
      }}
      onLoading={onLoading}
      compact={compact}
      // the navy the atlas always had
      clear="#002766"
      className={className}
    />
  );
}
