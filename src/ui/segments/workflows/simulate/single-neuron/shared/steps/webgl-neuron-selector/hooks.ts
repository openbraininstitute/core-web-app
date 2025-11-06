/* eslint-disable no-param-reassign */
import { useAtom, useSetAtom } from 'jotai';

import {
  neuronSectionNamesAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '../../context';
import { getSessionKey } from '../../helpers';
import {
  DEFAULT_CURRENT_INJECTION_CONFIG,
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '../../constant';
import { PainterManager } from './painter/manager';
import { getColorFromGeneratedPalette } from './colors';

import { useMorphology } from '@/hooks/use-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';

export function useRecordingsAndInjection(sessionId: string) {
  const recordingsKey = getSessionKey(RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const [recordings, updateRecordings] = useAtom(
    RecordLocationConfigurationAtomFamily(recordingsKey)
  );
  const injectionKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const [injection, updateInjection] = useAtom(StimulationConfigurationAtomFamily(injectionKey));

  return {
    recordings: recordings.filter(({ origin }) => origin !== 'injection'),
    addRecording: (sectionName: string, offset: number) => {
      updateRecordings([
        ...recordings,
        {
          offset,
          origin: 'recording',
          color: getColorFromGeneratedPalette(recordings.length),
          record_currents: false,
          section: sectionName,
        },
      ]);
    },
    injection,
    moveInjection: (sectionName: string) =>
      updateInjection({ ...injection, inject_to: sectionName }),
  };
}

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
