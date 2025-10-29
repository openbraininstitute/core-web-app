/* eslint-disable no-param-reassign */
import { useSetAtom } from 'jotai';

import { neuronSectionNamesAtomFamily } from '../../context';
import { DEFAULT_CURRENT_INJECTION_CONFIG } from '../../constant';
import { PainterManager } from './painter/manager';

import { useMorphology } from '@/hooks/use-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';

export function useCleanMorphology(
  painterManager: PainterManager,
  meModelId: string,
  projectId: string,
  virtualLabId: string,
  sessionId: string
) {
  const setSecNames = useSetAtom(neuronSectionNamesAtomFamily(sessionId));

  return useMorphology({
    modelId: meModelId,
    callback: (morphology) => {
      const prunedMorpho = removeNoDiameterSection(morphology);
      painterManager.morphology = prunedMorpho;
      const sectionNames = Object.keys(morphology);
      setSecNames(sectionNames);

      if (!sectionNames.includes(DEFAULT_CURRENT_INJECTION_CONFIG.inject_to)) {
        throw new Error('No soma section present');
      }
    },
    projectId,
    virtualLabId,
  });
}

function removeNoDiameterSection(morphology: Morphology) {
  const pruned = Object.entries(morphology).reduce((acc: Morphology, [secName, sec]) => {
    if (!sec.diam) return acc;

    acc[secName] = sec;
    return acc;
  }, {});
  return pruned satisfies Morphology;
}
