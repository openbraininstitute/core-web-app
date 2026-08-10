import { queryOptions, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { config } from '@/config';
import {
  fetchObiOneJson,
  STATIC_RESOURCE_QUERY_OPTIONS,
} from '@/features/scan-config/components/circuit-viz/obi-one-fetch';
import {
  SequentialLoaderClearedError,
  sequentialCellLoader,
} from '@/features/scan-config/components/circuit-viz/sequential-loader';
import {
  DEFAULT_NEURON_COLOR,
  SECTION_TYPE_COLORS,
} from '@/features/scan-config/components/color-by/palette';
import { NodesSchema } from '@/features/scan-config/types';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { SmallCircuitSource } from './types';

type Options = {
  circuitId: string;
  showAxons: boolean;
  colorsByNode?: string[];
  defaultColor?: string;
};

/**
 * Single / pair / small-microcircuit source: OBI-One `/circuit/viz` nodes + morphologies.
 */
export function useObiOneVizSource({
  circuitId,
  showAxons,
  colorsByNode,
  defaultColor = DEFAULT_NEURON_COLOR,
}: Options): SmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: nodes, error, isLoading } = useCircuitNodes(circuitId, virtualLabId, projectId);

  const cells: MorphoViewerSmallCircuitCell[] = useMemo(() => {
    return (
      nodes?.map((node, i) => ({
        // The query part is the viewer's reload key: flipping the axon toggle reloads the
        // morphology without moving the cell, so the camera keeps the user's zoom.
        id: `${makeNodeKey(circuitId, i)}?axons=${showAxons}`,
        center: node.position,
        orientation: node.orientation,
        somaRadius: 8,
        // Colour-by wins; else a lone cell reads by section type, a crowd by cell.
        color: colorsByNode?.[i] ?? (nodes.length === 1 ? SECTION_TYPE_COLORS : defaultColor),
      })) ?? []
    );
  }, [circuitId, showAxons, nodes, colorsByNode, defaultColor]);

  // Keyed by the id's path part, which is what the viewer hands back to `loadCell`.
  const nodesById = useMemo(() => {
    if (!nodes) return new Map<string, NonNullable<typeof nodes>[number]>();
    return new Map(nodes.map((node, i) => [makeNodeKey(circuitId, i), node]));
  }, [circuitId, nodes]);

  const loadCell = useCallback(
    async (cellId: string) => {
      const node = nodesById.get(cellId);
      if (!node) return null;

      const { morphology_file: file, morphology_name: name } = node;
      try {
        return await sequentialCellLoader.load({
          virtualLabId,
          projectId,
          circuitId,
          cellId,
          name,
          file,
          showAxon: showAxons,
        });
      } catch (error) {
        // An axon toggle clears the queue; a cancelled load is not a failure.
        if (error instanceof SequentialLoaderClearedError) return null;
        throw error;
      }
    },
    [nodesById, virtualLabId, projectId, circuitId, showAxons]
  );

  return {
    cells,
    loadCell,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
  };
}

/** OBI-One `/circuit/viz/{id}/nodes`, cached per circuit. Shared with synapse projection. */
export function circuitNodesQueryOptions(id: string, virtualLabId: string, projectId: string) {
  return queryOptions({
    queryKey: keyBuilder.circuitNodes(id),
    queryFn: async () =>
      NodesSchema.parse(
        await fetchObiOneJson(`${config.OBI_ONE_URL}/circuit/viz/${id}/nodes`, {
          virtualLabId,
          projectId,
        })
      ),
    ...STATIC_RESOURCE_QUERY_OPTIONS,
  });
}

function useCircuitNodes(id: string, virtualLabId: string, projectId: string) {
  return useQuery(circuitNodesQueryOptions(id, virtualLabId, projectId));
}

/** The id's path part: what the viewer hands back to `loadCell` and error logs cite. */
export function makeNodeKey(circuitId: string, index: number) {
  return `${circuitId} #${index}`;
}
