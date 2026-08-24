import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { fetchCircuitViz, memodelMorphologyPath } from '@/api/one/circuit-visualization';
import { IDENTITY_QUATERNION } from '@/features/circuit-nodes/geometry-utils';
import {
  buildMorphoTree,
  buildSonataSectionIdIndex,
} from '@/features/scan-config/components/circuit-viz/build-morpho-tree';
import { STATIC_RESOURCE_QUERY_OPTIONS } from '@/features/scan-config/components/circuit-viz/query-options';
import { makeVizCellId } from '@/features/scan-config/components/circuit-viz/sources/node-key';
import { PLACEHOLDER_SOMA_RADIUS } from '@/features/scan-config/components/circuit-viz/sources/use-small-circuit-source';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import { MorphoViewerTreeItemType, SectionsArraySchema } from '@/features/scan-config/types';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { TSmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources/types';
import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';

type TOptions = {
  memodelId: string;
  showAxons?: boolean;
};

const MEMODEL_CELL_ID = 'memodel-cell';

/** An MEModel is one neuron at the origin, unrotated. */
const ORIGIN: [number, number, number] = [0, 0, 0];

/**
 * Viewer source for one MEModel, served by OBI-One `/memodel/viz/{id}/morphology`.
 * Sections carry `sonata_section_id`, so morphology locations can be picked here too.
 */
export function useMemodelVisualizationSource({
  memodelId,
  showAxons = false,
}: TOptions): TSmallCircuitSource {
  const { data: allSections, error, isLoading, refetch } = useMemodelMorphology(memodelId);
  // The simulation replaces the axon, so it is hidden by default.
  const sections = useMemo(
    () =>
      allSections?.filter((section) => showAxons || section.type !== MorphoViewerTreeItemType.Axon),
    [allSections, showAxons]
  );

  // The axon flag makes a new id, so toggling axons reloads the morphology in place.
  // `sonataSectionIds` must be keyed by this full id.
  const cellId = makeVizCellId(MEMODEL_CELL_ID, showAxons);

  // Only announce the cell once it can be loaded.
  const cells: MorphoViewerSmallCircuitCell[] = useMemo(
    () =>
      sections
        ? [
            {
              id: cellId,
              center: ORIGIN,
              orientation: IDENTITY_QUATERNION,
              somaRadius: PLACEHOLDER_SOMA_RADIUS,
              color: SECTION_TYPE_COLORS,
            },
          ]
        : [],
    [sections, cellId]
  );

  const loadCell = useCallback(
    async (id: string) => (sections ? buildMorphoTree(sections, id) : null),
    [sections]
  );

  // Built from the same filtered sections that `loadCell` draws.
  const sonataSectionIds = useMemo(
    () => (sections ? new Map([[cellId, buildSonataSectionIdIndex(sections)]]) : undefined),
    [sections, cellId]
  );

  const retry = useCallback(() => {
    refetch().catch(() => {});
  }, [refetch]);

  return {
    cells,
    loadCell,
    isLoading,
    error,
    retry,
    sonataSectionIds,
  };
}

/** The MEModel's sections, cached indefinitely per workspace. */
function useMemodelMorphology(id: string) {
  const { virtualLabId, projectId } = useWorkspace();
  return useQuery({
    queryKey: ['memodel-viz-morphology', id, virtualLabId, projectId],
    queryFn: async () => {
      const json = await fetchCircuitViz(memodelMorphologyPath(id), { virtualLabId, projectId });
      return SectionsArraySchema.parse(json);
    },
    ...STATIC_RESOURCE_QUERY_OPTIONS,
  });
}
