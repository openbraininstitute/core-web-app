/* eslint-disable no-param-reassign */
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import {
  neuronSectionNamesAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '../../context';
import { getSessionKey } from '../../helpers';
import {
  DEFAULT_CURRENT_INJECTION_CONFIG,
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
} from '../../constant';
import { getColorFromGeneratedPalette } from './colors';
import { PainterManager } from './painter';

import { useMorphology } from '@/hooks/use-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

export function useVisibleSynapses(
  sessionId: string,
  mode: 'simulation' | 'build'
): Array<{
  color: string;
  data: Float32Array;
}> {
  const simulationConfigsKey = getSessionKey(SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const simulationConfigs = useAtomValue(SynaptomeConfigurationAtomFamily(simulationConfigsKey));
  const { sessionValue: buildConfigs } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const synaptomes = useAtomValue(synapsesPlacementAtom);
  const synapses = React.useMemo(() => {
    const result: Record<string, number[]> = {};
    if (!synaptomes) return [];

    const colors = new Map<string, string | undefined>();
    if (mode === 'simulation') {
      for (const config of simulationConfigs) {
        colors.set(config.id, config.color);
      }
    } else {
      // Build
      for (const [, config] of Array.from(buildConfigs?.synapseSets ?? [])) {
        colors.set(config.id, config.color);
      }
    }
    for (const value of Object.values(synaptomes)) {
      if (!value) continue;

      const color = colors.get(value.synapsePlacementConfigId);
      if (!color) continue;

      const { sectionSynapses } = value;
      for (const section of sectionSynapses) {
        const data = result[color] ?? [];
        for (const synapse of section.synapses) {
          // We set a unit radius because we will multiply it in PainterCloud.
          data.push(...synapse.coordinates, 1);
        }
        result[color] = data;
      }
    }
    return Object.keys(result).map((color) => ({
      color,
      data: new Float32Array(result[color]),
    }));
  }, [synaptomes, mode, simulationConfigs, buildConfigs]);
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
