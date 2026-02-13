import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomFamily, atomWithReset } from 'jotai/utils';

import {
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';

import { getSessionKey } from '../../helpers';
import { getColorFromGeneratedPalette } from './colors';

const synapsesToShowInViewerAtomFamily = atomFamily((key: string) => {
  const childAtom = atomWithReset<Array<{ color: string; data: Float32Array }>>([]);
  childAtom.debugLabel = `synapses-to-show-in-viewer-${key}`;
  return childAtom;
});

export function useVisibleSynapsesSetter(sessionId: string) {
  return useSetAtom(synapsesToShowInViewerAtomFamily(sessionId));
}

export function useVisibleSynapses(sessionId: string) {
  return useAtomValue(synapsesToShowInViewerAtomFamily(sessionId));
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
