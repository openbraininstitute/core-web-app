/* eslint-disable no-param-reassign */
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

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
import { getColorFromGeneratedPalette } from './colors';
import { PainterManager } from './painter';

import { useMorphology } from '@/hooks/use-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';

const atomSynapsesToShowInViewer = atom<Array<{ color: string; data: Float32Array }>>([]);

export function useVisibleSynapsesSetter() {
  return useSetAtom(atomSynapsesToShowInViewer);
}

export function useVisibleSynapses() {
  return useAtomValue(atomSynapsesToShowInViewer);
}

//   sessionId: string,
//   mode: 'simulation' | 'build'
// ): Array<{
//   color: string;
//   data: Float32Array;
// }> {
//   const synapsesConfigurations = useAtomValue(atomSynapsesConfigurationForViewer);
//   const simulationConfigsKey = getSessionKey(SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
//   const simulationConfigs = useAtomValue(SynaptomeConfigurationAtomFamily(simulationConfigsKey));
//   const { sessionValue: buildConfigs } = useBuildSingleNeuronSynaptomeSessionState({
//     sessionId,
//   });
//   const synaptomes = useAtomValue(synapsesPlacementAtom);
//   const synapses = React.useMemo(() => {
//     const result: Record<string, number[]> = {};
//     const items = Object.values(synaptomes ?? {}).filter(
//       (item) => !!item
//     ) as SectionSynapsesWith3D[];
//     console.log(
//       `Visible(${items.length}): ${items.map((item) => `${item.synapsePlacementConfigId.slice(-6)}`).join(', ')}`
//     );
//     if (!synaptomes) return [];

//     const colors = new Map<string, string | undefined>();
//     if (mode === 'simulation') {
//       if (synapsesConfigurations.length === 0) {
//         for (const config of simulationConfigs) {
//           colors.set(config.id, config.color);
//         }
//       } else {
//         for (const config of synapsesConfigurations) {
//           if (!config) continue;

//           const { color } = config;
//           colors.set(config.id, color ?? getColorFromGeneratedPalette(colors.size));
//         }
//       }
//     } else {
//       // Build
//       for (const [, config] of Array.from(buildConfigs?.synapseSets ?? [])) {
//         colors.set(config.id, config.color);
//       }
//     }
//     console.log(
//       `Colors(${colors.size}): ${Array.from(colors.keys())
//         .map((id) => `%c ${id.slice(-6)} `)
//         .join('')}`,
//       ...colors.values().map((color) => `color:#000;background:${color}`)
//     );
//     for (const value of items) {
//       const color = colors.get(value.synapsePlacementConfigId);
//       if (!color) {
//         console.warn(
//           'Could not find:',
//           value.synapsePlacementConfigId,
//           'in',
//           mode === 'simulation' ? simulationConfigs : buildConfigs
//         );
//         continue;
//       }

//       const { sectionSynapses } = value;
//       for (const section of sectionSynapses) {
//         const data = result[color] ?? [];
//         for (const synapse of section.synapses) {
//           // We set a unit radius because we will multiply it in PainterCloud.
//           data.push(...synapse.coordinates, 1);
//         }
//         result[color] = data;
//       }
//     }
//     return Object.keys(result).map((color) => ({
//       color,
//       data: new Float32Array(result[color]),
//     }));
//   }, [mode, simulationConfigs, buildConfigs, synaptomes, synapsesConfigurations]);
//   return synapses;
// }

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
