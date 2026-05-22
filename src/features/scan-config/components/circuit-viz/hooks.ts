import { useQuery } from '@tanstack/react-query';
import React from 'react';

import authFetch from '@/auth-fetch';
import { config } from '@/config';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { MorphoViewerTreeItemType, NodesSchema, SectionsArraySchema } from '../../types';
import { buildMorphoTree } from './circuit-viz';

import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';

const colors: string[] = [
  '#2347E8', // Blue
];

export function useCircuit(circuitId: string, showAxon: boolean) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: nodes, error, isLoading } = useCircuitNodes(circuitId, virtualLabId, projectId);
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

  const nodesById = React.useMemo(() => {
    if (!nodes) return new Map<string, NonNullable<typeof nodes>[number]>();
    return new Map(nodes.map((node) => [node.morphology_file + node.morphology_name, node]));
  }, [nodes]);

  const loadCell = async (id: string) => {
    const n = nodesById.get(id);

    if (!n) return;

    const nameParam = n.morphology_name ? `?name=${encodeURIComponent(n.morphology_name)}` : '';
    const url = `${config.OBI_ONE_URL}/circuit/viz/${circuitId}/morphologies/${encodeURIComponent(n.morphology_file)}${nameParam}`;

    const res = await authFetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'virtual-lab-id': virtualLabId,
        'project-id': projectId,
      },
    });

    const json = await res.json();

    const sections = SectionsArraySchema.parse(json);
    const filtered_sections = sections.filter(
      (s) => showAxon || s.type !== MorphoViewerTreeItemType.Axon
    );

    return buildMorphoTree(filtered_sections, id);
  };

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
