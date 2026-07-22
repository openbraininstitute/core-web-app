import React from 'react';

import { ServiceSonataLoader } from '@/services/sonata/loader';
import { resolveError } from '@/services/sonata/utils';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { ICircuit, TEntityTypeDict } from '@/api/entitycore/types';
import type { SonataNode } from '@/services/sonata/types';

export function useCircuitNodes({ id, type }: { id: string; type: TEntityTypeDict }) {
  const [nodes, setNodes] = React.useState<SonataNode[] | Error | undefined>(undefined);
  const { virtualLabId, projectId } = useWorkspace();
  React.useEffect(() => {
    const context = { virtualLabId, projectId, id, type };
    setNodes(undefined);
    loadCircuitNodes(context)
      .then(setNodes)
      .catch((ex) => {
        setNodes(ex instanceof Error ? ex : new Error(String(ex)));
      });
  }, [virtualLabId, projectId, id, type]);

  return nodes;
}

const SOMA_RADII = {
  human: 20,
  rat: 15,
  mouse: 12,
  bullfrog: 10,
  hamster: 10,
  cat: 15,
  hybridHumanMouse: 15,
  squid: 15,
  clawedFrog: 15,
  fly: 4,
  unknown: 10,
};

const MATCHER: Array<[keyof typeof SOMA_RADII, ...string[]]> = [
  ['human', 'homo'],
  ['rat', 'rattus'],
  ['mouse', 'musculus'],
  ['bullfrog', 'aquarana'],
  ['hamster', 'cricetulus'],
  ['cat', 'catus'],
  ['hybridHumanMouse', 'human-mouse'],
  ['squid', 'loligo'],
  ['clawedFrog', 'xenopus'],
  ['fly', 'drosophila'],
];

export function useSomaRadius(circuit: ICircuit): number {
  return React.useMemo(() => {
    const species = (circuit.subject?.species?.name ?? 'UNKNOWN').toLowerCase();
    for (const [type, ...substrings] of MATCHER) {
      for (const substring of substrings) {
        if (species.includes(substring)) return SOMA_RADII[type];
      }
    }
    return SOMA_RADII.unknown;
  }, [circuit]);
}

interface Context {
  virtualLabId: string;
  projectId: string;
  id: string;
  type: TEntityTypeDict;
}

async function loadCircuitNodes(context: Context) {
  const { virtualLabId, projectId, id, type } = context;
  const loader = new ServiceSonataLoader({ virtualLabId, projectId, modelId: id, modelType: type });
  try {
    const populationBeforeFiltering = await loader.asyncPopulations;
    const populations = Object.values(populationBeforeFiltering).filter(
      (population) =>
        Array.isArray(population.nodeIds) &&
        population.nodeIds.length > 0 &&
        population.files.length > 0
    );
    const [population] = populations;
    const nodes = await loader.getNodesOfPopulation(population);
    return nodes;
  } catch (ex) {
    const error = ex instanceof Error ? ex : new Error(resolveError(ex));
    error.cause = loader.steps;
    throw error;
  }
}
