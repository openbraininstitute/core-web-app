import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type {
  ICircuit,
  ICircuitSonataConfiguration,
} from '@/api/entitycore/types/entities/circuit';
import type {
  EdgePopulation,
  NodePopulation,
  ParsedCircuitConfig,
} from '@/features/circuit-nodes/types';

const CIRCUIT_CONFIG_PATH = 'circuit_config.json';

function resolveBase(manifest: Record<string, string> | undefined): string {
  const base = manifest?.$BASE_DIR ?? './';
  return base === './' || base === '.' ? '' : base.replace(/\/$/, '');
}

function stripBase(file: string, base: string): string {
  if (!file) return file;
  if (file.startsWith('$BASE_DIR/')) return file.slice('$BASE_DIR/'.length);
  if (base && file.startsWith(`${base}/`)) return file.slice(base.length + 1);
  return file;
}

function parseSonataConfig(
  raw: ICircuitSonataConfiguration,
  circuitAssetId: string
): ParsedCircuitConfig {
  const base = resolveBase(raw.manifest);
  const nodes: NodePopulation[] = [];
  const edges: EdgePopulation[] = [];

  for (const entry of raw.networks?.nodes ?? []) {
    const file = stripBase(entry.nodes_file ?? '', base);
    for (const [name, pop] of Object.entries(entry.populations ?? {})) {
      nodes.push({ name, type: pop.type, file });
    }
  }
  for (const entry of raw.networks?.edges ?? []) {
    const file = stripBase(entry.edges_file ?? '', base);
    for (const [name, pop] of Object.entries(entry.populations ?? {})) {
      edges.push({ name, type: pop.type, file });
    }
  }

  return { nodes, edges, circuitAssetId };
}

export function useCircuitConfig(circuit: ICircuit | undefined) {
  const context = useWorkspace();
  const asset = useMemo(
    () => circuit?.assets?.find((a) => a.label === AssetLabel.sonata_circuit),
    [circuit]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['circuit-nodes-config', circuit?.id, asset?.id],
    enabled: !!circuit?.id && !!asset?.id,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!circuit || !asset) throw new Error('Missing circuit or sonata_circuit asset');
      const response = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Circuit,
        entityId: circuit.id,
        id: asset.id,
        assetPath: CIRCUIT_CONFIG_PATH,
        asRawResponse: true,
      });
      const raw = (await response.json()) as ICircuitSonataConfiguration;
      return parseSonataConfig(raw, asset.id);
    },
  });

  return { config: data, asset, isLoading, error };
}
