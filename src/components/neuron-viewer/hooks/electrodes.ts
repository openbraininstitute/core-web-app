import { useAtom } from 'jotai';

import {
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';

import type {
  MorphoViewerElectrodeInjection,
  MorphoViewerElectrodeRecording,
} from '@bbp/morphoviewer';

export function useElectrodes(
  sessionId: string,
  disableElectrodes: boolean = false
): {
  recordings: MorphoViewerElectrodeRecording[];
  setRecordings(recordings: MorphoViewerElectrodeRecording[]): void;
  injection: MorphoViewerElectrodeInjection | undefined;
  setInjection(injection: MorphoViewerElectrodeInjection | undefined): void;
} {
  const recordingsKey = getSessionKey(RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const [recordings, updateRecordings] = useAtom(
    RecordLocationConfigurationAtomFamily(recordingsKey)
  );
  const injectionKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const [injection, updateInjection] = useAtom(StimulationConfigurationAtomFamily(injectionKey));

  return disableElectrodes
    ? {
        recordings: [],
        setRecordings: () => {},
        injection: undefined,
        setInjection: () => {},
      }
    : {
        recordings: recordings.filter(({ origin }) => origin !== 'injection'),
        setRecordings: (list: MorphoViewerElectrodeRecording[]) => {
          updateRecordings([...recordings.filter(({ origin }) => origin === 'injection'), ...list]);
        },
        injection,
        setInjection: (value: MorphoViewerElectrodeInjection) =>
          updateInjection({
            ...injection,
            inject_to: value.inject_to,
          }),
      };
}
