'use client';

import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import CircuitTable from '../global/circuit-table';
import { CircuitSchemaProps } from '../type';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import {
  buildHierarchyMap,
  getBrainRegionDescendantsAndAncestorsNodes,
} from '@/features/brain-region-hierarchy/helpers';

function brainRegionFilter({
  circuits,
  regionSet,
}: {
  circuits: CircuitSchemaProps[];
  region: string | undefined;
  regionSet: Set<string>;
}) {
  let count = 0;

  function recurse(circuit: CircuitSchemaProps): CircuitSchemaProps | null {
    const brainRegionMatches = regionSet.has(circuit.brainRegion.trim().toLowerCase());

    const filteredSubs = (circuit.subcircuits?.map(recurse).filter(Boolean) ??
      []) as CircuitSchemaProps[];

    if (brainRegionMatches || filteredSubs.length > 0) {
      count += 1;
      return {
        ...circuit,
        subcircuits: filteredSubs,
      };
    }

    return null;
  }

  const filteredTree = circuits.map(recurse).filter(Boolean) as CircuitSchemaProps[];

  return {
    filteredTree,
    count,
  };
}

export function useFilteredCircuits({ dataKey }: { dataKey: string }) {
  const { node } = useBrainRegionHierarchy({ dataKey });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [circuitsData, setCircuitsData] = useState<CircuitSchemaProps[]>([]);

  useEffect(() => {
    const fetchCircuit = async () => {
      try {
        setLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error('Error: ' + response.statusText);
        }

        const data: CircuitSchemaProps[] = await response.json();

        setCircuitsData(data);
      } catch (er) {
        setError(er instanceof Error ? er.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCircuit();
  }, []);

  const brainRegions = useAtomValue(brainRegionBasicCellGroupsRegionsHierarchyAtom);
  const selectedBrainRegions = getBrainRegionDescendantsAndAncestorsNodes(
    [node.id],
    brainRegions?.root!
  );
  const brainRegionByIdMap = buildHierarchyMap(brainRegions?.root!);

  const brainRegionSet = useMemo(() => {
    return new Set(
      selectedBrainRegions.map(
        (br) => brainRegionByIdMap.get(br.id)?.name.toLowerCase().trim() ?? ''
      )
    );
  }, [selectedBrainRegions, brainRegionByIdMap]);

  const filteredCircuits = brainRegionFilter({
    region: node?.id,
    regionSet: brainRegionSet,
    circuits: circuitsData,
  });

  return { loading, error, filteredCircuits };
}

export default function ExploreCircuitTable({ data }: { data: CircuitSchemaProps[] }) {
  return (
    <div className="relative flex w-full flex-col bg-white pt-10">
      <CircuitTable data={data} />
    </div>
  );
}
