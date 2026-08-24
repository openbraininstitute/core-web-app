import React from 'react';

import type { ICircuit } from '@/api/entitycore/types';

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
