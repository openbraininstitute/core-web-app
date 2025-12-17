/* eslint-disable no-param-reassign */
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

import {
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '../../context';
import { getSessionKey } from '../../helpers';
import {
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '../../constant';
import { getColorFromGeneratedPalette } from './colors';

const atomSynapsesToShowInViewer = atom<Array<{ color: string; data: Float32Array }>>([]);

export function useVisibleSynapsesSetter() {
  return useSetAtom(atomSynapsesToShowInViewer);
}

export function useVisibleSynapses() {
  return useAtomValue(atomSynapsesToShowInViewer);
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
