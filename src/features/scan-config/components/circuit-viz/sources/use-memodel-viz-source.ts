import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { fetchCircuitViz, memodelMorphologyPath } from '@/api/one/circuit-visualization';
import {
  buildMorphoTree,
  buildSonataSectionIdIndex,
} from '@/features/scan-config/components/circuit-viz/build-morpho-tree';
import { STATIC_RESOURCE_QUERY_OPTIONS } from '@/features/scan-config/components/circuit-viz/query-options';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import { MorphoViewerTreeItemType, SectionsArraySchema } from '@/features/scan-config/types';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { TSmallCircuitSource } from './types';

type TOptions = {
  memodelId: string;
  showAxons?: boolean;
  /** Colour-by override; when absent the cell is coloured by section type, as a lone cell is. */
  colorsByNode?: string[];
};

const MEMODEL_CELL_ID = 'memodel-cell';

/** Same placeholder radius as the small-circuit source, so the camera frames alike. */
const SOMA_RADIUS = 8;
/** An MEModel is one neuron in its own frame: at the origin, unrotated. */
const ORIGIN: [number, number, number] = [0, 0, 0];
const IDENTITY_ORIENTATION: [number, number, number, number] = [0, 0, 0, 1];

/**
 * Single-neuron source: OBI-One `/memodel/viz/{id}/morphology`.
 *
 * An MEModel is not stored as a Circuit, so there is no nodes file to read and no placement
 * to fetch — the one cell is stated here. Its sections carry `sonata_section_id`, so
 * morphology locations can be picked exactly as on a single-scale circuit.
 *
 * @returns The viewer's data contract: one cell, its morphology, and load state.
 */
export function useMemodelVizSource({
  memodelId,
  showAxons = false,
  colorsByNode,
}: TOptions): TSmallCircuitSource {
  const { data: allSections, error, isLoading, refetch } = useMemodelMorphology(memodelId);
  // The simulation replaces the axon at instantiation, so the full arbor only obscures.
  const sections = useMemo(
    () =>
      allSections?.filter((section) => showAxons || section.type !== MorphoViewerTreeItemType.Axon),
    [allSections, showAxons]
  );

  // The reload key: flipping the axon toggle reloads the morphology without moving the
  // cell, so the camera keeps the user's zoom. Mirrors `makeVizCellId` — morphoviewer
  // strips the query part before calling `loadCell`, while `useMorphologyLocationSelection`
  // looks `sonataSectionIds` up by the full id the viewer is holding.
  const cellId = `${MEMODEL_CELL_ID}?axons=${showAxons}`;

  // Announced only once loadable: the viewer asks for each cell exactly once.
  const cells: MorphoViewerSmallCircuitCell[] = useMemo(
    () =>
      sections
        ? [
            {
              id: cellId,
              center: ORIGIN,
              orientation: IDENTITY_ORIENTATION,
              somaRadius: SOMA_RADIUS,
              // Colour-by wins; else by section type, because telling this cell's
              // dendrites from its axon is the whole point of drawing one.
              color: colorsByNode?.[0] ?? SECTION_TYPE_COLORS,
            },
          ]
        : [],
    [sections, cellId, colorsByNode]
  );

  const loadCell = useCallback(
    async (id: string) => (sections ? buildMorphoTree(sections, id) : null),
    [sections]
  );

  // Indexed from the filtered sections, matching what `loadCell` draws with axons off.
  const sonataSectionIds = useMemo(
    () => (sections ? new Map([[cellId, buildSonataSectionIdIndex(sections)]]) : undefined),
    [sections, cellId]
  );

  const retry = useCallback(() => {
    // Rejections settle the query with `error` set, which the caller already renders.
    refetch().catch(() => {});
  }, [refetch]);

  return {
    cells,
    loadCell,
    isLoading,
    error: toError(error),
    retry,
    sonataSectionIds,
  };
}

/**
 * The MEModel's sections, cached indefinitely.
 *
 * Exported so other views share this query key and are served from cache.
 */
export function useMemodelMorphology(id: string) {
  const { virtualLabId, projectId } = useWorkspace();
  return useQuery({
    queryKey: ['memodel-viz-morphology', id],
    queryFn: async () => {
      const json = await fetchCircuitViz(memodelMorphologyPath(id), { virtualLabId, projectId });
      return SectionsArraySchema.parse(json);
    },
    ...STATIC_RESOURCE_QUERY_OPTIONS,
  });
}

function toError(error: unknown): Error | null {
  if (!error) return null;
  return error instanceof Error ? error : new Error(String(error));
}
