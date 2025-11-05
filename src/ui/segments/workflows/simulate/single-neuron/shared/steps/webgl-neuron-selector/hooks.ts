/* eslint-disable no-param-reassign */
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

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
import { synapsesPlacementAtom } from '@/state/synaptome';

export function useVisibleSynapses(): Array<{
  type: string;
  data: Float32Array;
}> {
  const synaptomes = useAtomValue(synapsesPlacementAtom);
  const synapses = React.useMemo(() => {
    const result: Record<string, number[]> = {};
    if (!synaptomes) return [];

    for (const value of Object.values(synaptomes)) {
      if (!value) continue;

      const { sectionSynapses } = value;
      for (const section of sectionSynapses) {
        const key = section.section_id.slice(0, 4).toLocaleLowerCase();
        const data = result[key] ?? [];
        for (const synapse of section.synapses) {
          // We set a unit radius because we will multiply it in PainterCloud.
          data.push(...synapse.coordinates, 1);
        }
        result[key] = data;
      }
    }
    return Object.keys(result).map((key) => ({
      type: key,
      data: new Float32Array(result[key]),
    }));
  }, [synaptomes]);
  console.log('🚀 [hooks] synapses =', synapses); // @FIXME: Remove this line written on 2025-11-05 at 17:13
  return synapses;
}

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
