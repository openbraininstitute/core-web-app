import React from 'react';
import { useAtom } from 'jotai';

import { PlotData } from '../types';

import { PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY } from '../constant';
import { ExperimentalSetupConfigurationAtomFamily } from '../context';
import { getSessionKey } from '../helpers';

import { genericSingleNeuronSimulationPlotDataAtomFamily } from '@/state/simulate/single-neuron';

const THROTTLE = 1000;

type Type = Record<string, PlotData> | null;

export function useRecordingPlotData(sessionId: string): Type {
  const [recordingPlotData, setRecordingPlotData] = React.useState<Type>(null);
  const refTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const refDataToSend = React.useRef<Type>(null);
  const [rawData] = useAtom(genericSingleNeuronSimulationPlotDataAtomFamily(sessionId));
  React.useEffect(() => {
    const handleThrottling = () => {
      if (refDataToSend.current) {
        setRecordingPlotData(refDataToSend.current);
      }
      refTimeout.current = globalThis.setTimeout(handleThrottling, THROTTLE);
    };
    if (!refTimeout.current) {
      // First call
      setRecordingPlotData(rawData);
      refTimeout.current = globalThis.setTimeout(handleThrottling, THROTTLE);
    }
    if (rawData) refDataToSend.current = rawData;
  }, [rawData]);
  return recordingPlotData;
}

export function useCurrentSimulationConfig(sessionId: string) {
  const key = getSessionKey(PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const [state] = useAtom(ExperimentalSetupConfigurationAtomFamily(key));
  return state;
}
