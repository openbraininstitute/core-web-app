import { useAtomValue } from 'jotai';
import React from 'react';
import { StaticAtlas } from './static-atlas';
import { selectedBrainRegionAtom } from '@/state/brain-regions';

export interface CircuitPerRegion {
  name: string;
  description: string;
  registrationDate: Date;
  url: string;
  region: string;
}

const CIRCUITS: CircuitPerRegion[] = [
  {
    name: 'SSCx O1',
    description: 'A Model of Rodent Neocortical Micro- and Mesocircuitry',
    registrationDate: new Date(2023, 4, 12),
    url: 'https://zenodo.org/records/8026353',
    region: 'Primary somatosensory area',
  },
  {
    name: 'Hippocampus O1',
    description: 'Rat CA1 model',
    registrationDate: new Date(2024, 10, 4),
    url: 'https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/TN3DUI',
    region: "Ammon's horn",
  },
];

export function useCircuitsForSelectedRegion(): CircuitPerRegion[] {
  const [circuits, setCircuits] = React.useState<CircuitPerRegion[]>([]);
  const selectedRegion = useAtomValue(selectedBrainRegionAtom);
  React.useEffect(() => {
    if (!selectedRegion) {
      setCircuits([]);
      return;
    }

    findCircuitsForSelectedRegionName(selectedRegion.title).then(setCircuits);
  }, [selectedRegion]);
  return circuits;
}

/**
 * For a region, map all decendents and ancestors (but no cousin).
 */
const brainRegionFamilies = new Map<string, Set<string>>();

export async function findCircuitsForSelectedRegionName(
  regionName: string
): Promise<CircuitPerRegion[]> {
  if (!atlas) atlas = await StaticAtlas.getInstance();
  const region = atlas.getRegionByName(regionName);
  if (!region) return [];

  const family: Set<string> = getFamilyIds(region.id, atlas);
  return CIRCUITS.filter((circuit) => {
    const regionId = atlas?.getRegionByName(circuit.region)?.id;
    return regionId ? family.has(regionId) : false;
  });
}

let atlas: StaticAtlas | null = null;

function getFamilyIds(regionId: string, atlasInstance: StaticAtlas): Set<string> {
  const cachedFamily = brainRegionFamilies.get(regionId);
  if (cachedFamily) return cachedFamily;

  const family = new Set(atlasInstance.getFamilyIds(regionId));
  brainRegionFamilies.set(regionId, family);
  return family;
}
