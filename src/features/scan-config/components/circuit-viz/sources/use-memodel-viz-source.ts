import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import authFetch from '@/auth-fetch';
import { config } from '@/config';
import { buildMorphoTree } from '@/features/scan-config/components/circuit-viz/build-morpho-tree';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import { SectionsArraySchema } from '@/features/scan-config/types';
import { MorphoViewerTreeItemType } from '@/morpho-viewer';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { SmallCircuitSource } from './types';

type Options = {
  memodelId: string;
  showAxons?: boolean;
  /** Colour-by override; when absent the cell is coloured by section type, as legacy is. */
  colorsByNode?: string[];
};

const MEMODEL_CELL_ID = 'memodel-cell';

const SOMA_RADIUS = 8;
/** An MEModel is one neuron in its own frame: at the origin, unrotated. */
const ORIGIN: [number, number, number] = [0, 0, 0];
const IDENTITY_ORIENTATION: [number, number, number, number] = [0, 0, 0, 1];

/**
 * Single-neuron source: OBI-One `/memodel/viz/{id}/morphology`.
 *
 * An MEModel is not stored as a Circuit, so there is no nodes endpoint and no placement to
 * fetch — the one cell is stated here. Its sections carry `sonata_section_id`, so morphology
 * locations can be picked exactly as on a single-scale circuit.
 *
 * @returns The viewer's data contract: one cell, its morphology, and load state.
 */
export function useMemodelVizSource({
  memodelId,
  showAxons = false,
  colorsByNode,
}: Options): SmallCircuitSource {
  const { data: allSections, error, isLoading } = useMemodelMorphology(memodelId);
  // The simulation replaces the axon at instantiation, so the full arbor only obscures.
  const sections = useMemo(
    () =>
      allSections?.filter((section) => showAxons || section.type !== MorphoViewerTreeItemType.Axon),
    [allSections, showAxons]
  );

  // Announced only once loadable: the viewer asks for each cell exactly once.
  const cells: MorphoViewerSmallCircuitCell[] = useMemo(
    () =>
      sections
        ? [
            {
              // The reload key: flipping the axon toggle reloads the morphology without
              // moving the cell, so the camera keeps the user's zoom.
              id: `${MEMODEL_CELL_ID}?axons=${showAxons}`,
              center: ORIGIN,
              orientation: IDENTITY_ORIENTATION,
              somaRadius: SOMA_RADIUS,
              // Colour-by wins; else by section type.
              color: colorsByNode?.[0] ?? SECTION_TYPE_COLORS,
            },
          ]
        : [],
    [sections, showAxons, colorsByNode]
  );

  const loadCell = useCallback(
    async (cellId: string) => (sections ? buildMorphoTree(sections, cellId) : null),
    [sections]
  );

  return {
    cells,
    loadCell,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
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
      const res = await authFetch(`${config.OBI_ONE_URL}/memodel/viz/${id}/morphology`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'virtual-lab-id': virtualLabId,
          'project-id': projectId,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch memodel morphology for id "${id}"!`);
      }

      return SectionsArraySchema.parse(await res.json());
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
