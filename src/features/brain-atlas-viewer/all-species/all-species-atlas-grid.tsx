'use client';

import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { Loader } from '@/components/loader';
import { AllSpeciesAtlasCard } from '@/features/brain-atlas-viewer/all-species/all-species-atlas-card';
import { getCachedBrainRegionMeshArrayBuffer } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/services/services';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import {
  hasSpeciesAtlasPreview,
  orderHierarchiesBySpeciesDisplayNames,
} from '@/features/brain-region-hierarchy/helpers';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { log } from '@/utils/logger';

import type { SpeciesRuntimeHierarchy } from '@/features/brain-atlas-viewer/all-species/helpers';

function warmSpeciesAtlasMeshCache(
  queryClient: QueryClient,
  queryOption: ReturnType<typeof useBrainRegionRootHierarchyQuery>['queryOption'],
  hierarchies: SpeciesRuntimeHierarchy[]
) {
  for (const hierarchy of hierarchies) {
    const { atlasId } = hierarchy;
    if (!atlasId) continue;

    void queryClient
      .ensureQueryData(queryOption(hierarchy.id))
      .then((root) =>
        getCachedBrainRegionMeshArrayBuffer({ atlasId, regionId: root.id, queryClient })
      )
      .catch((error) => {
        log('debug', '[AllSpeciesAtlasGrid] mesh prefetch failed', {
          hierarchyId: hierarchy.id,
          error,
        });
      });
  }
}

export function AllSpeciesAtlasGrid() {
  const queryClient = useQueryClient();
  const { queryOption } = useBrainRegionRootHierarchyQuery();
  const { runtimeHierarchies, loading } = useHierarchyRuntimeMetadataQuery();
  const orderedHierarchies = useMemo(
    () =>
      orderHierarchiesBySpeciesDisplayNames(runtimeHierarchies).filter((hierarchy) =>
        hasSpeciesAtlasPreview(hierarchy)
      ),
    [runtimeHierarchies]
  );

  useEffect(() => {
    if (loading) return;
    warmSpeciesAtlasMeshCache(queryClient, queryOption, orderedHierarchies);
  }, [loading, orderedHierarchies, queryClient, queryOption]);

  if (loading) {
    return (
      <div className="flex min-h-64 w-full items-center justify-center py-12">
        <Loader className="text-primary-8" />
      </div>
    );
  }

  if (!orderedHierarchies.length) {
    return (
      <div className="flex min-h-64 w-full items-center justify-center px-6 py-12 text-center text-primary-8">
        No species atlases are available.
      </div>
    );
  }

  return (
    <div id="all-species-atlas-grid" data-testid="all-species-atlas-grid" className="mr-1.5 p-1">
      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {orderedHierarchies.map((hierarchy) => (
          <li key={hierarchy.id}>
            <AllSpeciesAtlasCard hierarchy={hierarchy} />
          </li>
        ))}
      </ul>
    </div>
  );
}
