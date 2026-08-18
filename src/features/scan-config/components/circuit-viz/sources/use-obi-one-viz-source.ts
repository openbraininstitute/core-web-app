import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { STATIC_RESOURCE_QUERY_OPTIONS } from '@/features/scan-config/components/circuit-viz/query-options';
import {
  SequentialLoaderClearedError,
  sequentialCellLoader,
} from '@/features/scan-config/components/circuit-viz/sequential-loader';
import {
  DEFAULT_NEURON_COLOR,
  SECTION_TYPE_COLORS,
} from '@/features/scan-config/components/color-by/palette';
import {
  getCircuitLoader,
  invalidateCircuitLoader,
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { TSmallCircuitSource } from './types';

type TOptions = {
  circuitId: string;
  showAxons: boolean;
  colorsByNode?: string[];
  defaultColor?: string;
};

/**
 * Single / pair / small-microcircuit source: SONATA nodes read in the browser, morphologies
 * from OBI-One `/circuit/viz` (the only place H5/ASC/containers parse and sections carry
 * their NEURON ids).
 */
export function useObiOneVizSource({
  circuitId,
  showAxons,
  colorsByNode,
  defaultColor = DEFAULT_NEURON_COLOR,
}: TOptions): TSmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const {
    data: nodes,
    error: nodesError,
    isLoading,
    refetch,
  } = useCircuitNodes(circuitId, virtualLabId, projectId);

  const [loadError, setLoadError] = useState<Error | null>(null);

  const [sonataSectionIds, setSonataSectionIds] =
    useState<Map<string, Map<number, string>>>(EMPTY_SECTION_IDS);

  const cells: MorphoViewerSmallCircuitCell[] = useMemo(() => {
    return (
      nodes?.map((node, i) => ({
        id: makeVizCellId(makeNodeKey(circuitId, i), showAxons),
        center: node.position,
        orientation: node.orientation,
        somaRadius: 8,
        // colour-by wins; else a lone cell reads by section type, a crowd by cell.
        color: colorsByNode?.[i] ?? (nodes.length === 1 ? SECTION_TYPE_COLORS : defaultColor),
      })) ?? []
    );
  }, [circuitId, showAxons, nodes, colorsByNode, defaultColor]);

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
        const loaded = await sequentialCellLoader.load({
          virtualLabId,
          projectId,
          circuitId,
          cellId,
          name,
          file,
          showAxon: showAxons,
        });
        // guard prevents a repeated load of the same cell from re-rendering.
        const vizCellId = makeVizCellId(cellId, showAxons);
        setSonataSectionIds((previous) =>
          previous.get(vizCellId) === loaded.sonataSectionIds
            ? previous
            : new Map(previous).set(vizCellId, loaded.sonataSectionIds)
        );
        return loaded;
      } catch (error) {
        if (error instanceof SequentialLoaderClearedError) return null;
        setLoadError(
          (previous) => previous ?? (error instanceof Error ? error : new Error(String(error)))
        );
        throw error;
      }
    },
    [nodesById, virtualLabId, projectId, circuitId, showAxons]
  );

  const retry = useCallback(() => {
    setLoadError(null);
    setSonataSectionIds(EMPTY_SECTION_IDS);
    sequentialCellLoader.clear();
    invalidateCircuitLoader({ circuitId, virtualLabId, projectId });
    // The synapse query holds its own error state; without this a failed synapse read
    // survives every retry until a full remount.
    queryClient.invalidateQueries({ queryKey: keyBuilder.circuitSynapses(circuitId) });
    refetch();
  }, [refetch, queryClient, circuitId, virtualLabId, projectId]);

  return {
    cells,
    loadCell,
    isLoading,
    error: loadError ?? toError(nodesError),
    retry,
    sonataSectionIds,
  };
}

const EMPTY_SECTION_IDS = new Map<string, Map<number, string>>();

function toError(cause: unknown): Error | null {
  if (!cause) return null;
  return cause instanceof Error ? cause : new Error(String(cause));
}

/** The id the viewer knows a cell by; the query part is its reload key on an axon toggle. */
function makeVizCellId(nodeKey: string, showAxons: boolean) {
  return `${nodeKey}?axons=${showAxons}`;
}

/** The circuit's nodes, read from its SONATA files in the browser. Shared with synapses. */
export function circuitNodesQueryOptions(id: string, virtualLabId: string, projectId: string) {
  return queryOptions({
    queryKey: keyBuilder.circuitNodes(id),
    queryFn: () => getCircuitLoader({ circuitId: id, virtualLabId, projectId }).getNodes(),
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
