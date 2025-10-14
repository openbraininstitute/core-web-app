import React from 'react';
import { useAtom } from 'jotai';

import { tgdFullscreenToggle } from '@tolokoban/tgd';
import { EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  ExperimentalSetupConfigurationAtomFamily,
  genericSingleNeuronSimulationPlotDataAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';

import type { PlotData } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

const THROTTLE = 1000;

type Type = Record<string, PlotData> | null;

export function useRecordingPlotData(sessionId: string): Type {
  const [recordingPlotData, setRecordingPlotData] = React.useState<Type>(null);
  const refInterval = React.useRef<NodeJS.Timeout | null>(null);
  const refLatestData = React.useRef<Type>(null);
  const refIsFirstData = React.useRef<boolean>(true);
  const [rawData] = useAtom(genericSingleNeuronSimulationPlotDataAtomFamily(sessionId));

  // update latest data reference whenever rawData changes
  React.useEffect(() => {
    refLatestData.current = rawData;

    // immediately update on first data
    if (refIsFirstData.current && rawData) {
      setRecordingPlotData(rawData);
      refIsFirstData.current = false;
    }
  }, [rawData]);

  // set up throttled update interval (only once)
  React.useEffect(() => {
    refInterval.current = globalThis.setInterval(() => {
      if (refLatestData.current) {
        setRecordingPlotData(refLatestData.current);
      }
    }, THROTTLE);

    return () => {
      if (refInterval.current) {
        globalThis.clearInterval(refInterval.current);
        refInterval.current = null;
      }
    };
  }, []);

  return recordingPlotData;
}

export function useCurrentSimulationConfig(sessionId: string) {
  const key = getSessionKey(EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const [state] = useAtom(ExperimentalSetupConfigurationAtomFamily(key));
  return state;
}

export function useFullscreenSwitcher() {
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  return { refContainer, toggleFullscreen: () => tgdFullscreenToggle(refContainer.current) };
}
