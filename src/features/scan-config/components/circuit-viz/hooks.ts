import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import authFetch from '@/auth-fetch';
import { config } from '@/config';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import {
  MorphoViewerTreeItemType,
  NodesSchema,
  type Sections,
  SectionsArraySchema,
} from '../../types';
import { buildMorphoTree } from './circuit-viz';

import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';

const colors: string[] = [
  '#2347E8', // Blue
];

export function useCircuit(id: string, showAxon: boolean) {
  const promises = React.useRef<Record<string, Promise<Sections>>>({});
  const { virtualLabId, projectId } = useWorkspace();
  const { data: nodes, error, isLoading } = useCircuitNodes(id, virtualLabId, projectId);
  const queryClient = useQueryClient();
  const circuit: MorphoViewerSmallCircuitCell[] = React.useMemo(() => {
    return (
      nodes?.map((node, i) => ({
        id: node.morphology_file + node.morphology_name,
        center: node.position,
        orientation: node.orientation,
        somaRadius: 8,
        color: colors[i % colors.length],
      })) ?? []
    );
  }, [nodes]);

  React.useEffect(() => {
    nodes?.forEach((n) => {
      promises.current[n.morphology_file + n.morphology_name] = queryClient.fetchQuery({
        queryKey: ['morphology', id, n.morphology_file, n.morphology_name],
        queryFn: async () => {
          const nameParam = n.morphology_name
            ? `?name=${encodeURIComponent(n.morphology_name)}`
            : '';
          const url = `${config.OBI_ONE_URL}/circuit/viz/${id}/morphologies/${encodeURIComponent(n.morphology_file)}${nameParam}`;

          const res = await authFetch(url, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'virtual-lab-id': virtualLabId,
              'project-id': projectId,
            },
          });

          const json = await res.json();
          return SectionsArraySchema.parse(json);
        },
        staleTime: Infinity,
        gcTime: Infinity,
      });
    });
  }, [nodes, id, projectId, virtualLabId, queryClient]);

  return {
    circuit,
    isLoading,
    error,
    loadCell: async (morphId: string) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const data = await promises.current[morphId];
      const sections = data.filter((s) => showAxon || s.type !== MorphoViewerTreeItemType.Axon);

      return buildMorphoTree(sections, morphId);
    },
  };
}
function useCircuitNodes(
  id: string,
  virtualLabId: string,
  projectId: string
): { data: any; error: any; isLoading: any } {
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

// interface CircuitNode {
//   morphology_file: string
//   morphology_name: string
//   position: [number, number, number]
//   orientation: [number, number, number, number]
// }

// function assertCircuitNodeArray(data: unknown): asserts data is CircuitNode[] {}
