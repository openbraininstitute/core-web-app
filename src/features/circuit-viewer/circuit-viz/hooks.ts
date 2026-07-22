import { useQuery } from '@tanstack/react-query';
import React from 'react';

import authFetch from '@/auth-fetch';
import { config } from '@/config';
import { DEFAULT_NEURON_COLOR } from '@/features/circuit-viewer/color-by/palette';
import { NodesSchema } from '@/features/circuit-viewer/types';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { sequentialCellLoader } from './sequential-loader';

import type {
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
} from '@/morpho-viewer';

export function useCircuit(
  circuitId: string,
  showAxon: boolean,
  colorsByNode?: string[],
  defaultColor: string = DEFAULT_NEURON_COLOR
) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: nodes, error, isLoading } = useCircuitNodes(circuitId, virtualLabId, projectId);
  const circuit: MorphoViewerSmallCircuitCell[] = React.useMemo(() => {
    return (
      nodes?.map((node, i) => ({
        id: makeNodeKey(circuitId, showAxon, i),
        center: node.position,
        orientation: node.orientation,
        somaRadius: 8,
        // default color (blue, or background-adapted), overridden per node
        // when coloring by a property
        color: colorsByNode?.[i] ?? defaultColor,
      })) ?? []
    );
  }, [circuitId, showAxon, nodes, colorsByNode, defaultColor]);

  const nodesById = React.useMemo(() => {
    if (!nodes) return new Map<string, NonNullable<typeof nodes>[number]>();
    return new Map(nodes.map((node, i) => [makeNodeKey(circuitId, showAxon, i), node]));
  }, [circuitId, showAxon, nodes]);

  const loadCell: (cellId: string) => Promise<MorphoViewerSmallCircuitCellData | null> =
    React.useCallback(
      async (cellId: string) => {
        const node = nodesById.get(cellId);
        if (!node) {
          return null;
        }

        const { morphology_file: file, morphology_name: name } = node;
        return await sequentialCellLoader.load({
          virtualLabId,
          projectId,
          circuitId,
          cellId,
          name,
          file,
          showAxon,
        });
      },
      [nodesById, virtualLabId, projectId, circuitId, showAxon]
    );

  return {
    circuit,
    isLoading,
    error,
    loadCell,
  };
}
function useCircuitNodes(id: string, virtualLabId: string, projectId: string) {
  return useQuery({
    queryKey: keyBuilder.circuitNodes(id),
    queryFn: async () => {
      const res = await authFetch(`${config.OBI_ONE_URL}/circuit/viz/${id}/nodes`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'virtual-lab-id': virtualLabId,
          'project-id': projectId,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch circuit viz for id "${id}"!`);
      }

      const json = await res.json();
      return NodesSchema.parse(json);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

function makeNodeKey(circuitId: string, showAxon: boolean, index: number) {
  return `${circuitId} / ${showAxon} #${index}`;
}
