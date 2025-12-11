import React from 'react';
import { useAtom, useSetAtom } from 'jotai';

import { tgdFullscreenToggle } from '@tolokoban/tgd';
import { EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  ExperimentalSetupConfigurationAtomFamily,
  genericSingleNeuronSimulationPlotDataAtomFamily,
  neuronSectionNamesAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';

import type { PlotData } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useMorphology } from '@/hooks/use-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';

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

export function useCleanMorphology(
  meModelId: string,
  sessionId: string,
  callback: (morphology: Morphology) => void
) {
  const { virtualLabId, projectId } = useWorkspace();
  const setSecNames = useSetAtom(neuronSectionNamesAtomFamily(sessionId));

  return useMorphology({
    modelId: meModelId,
    callback: (morphology) => {
      const prunedMorpho = removeNoDiameterSection(morphology);
      callback(prunedMorpho);
      const sectionNames = Object.keys(morphology);
      setSecNames(sectionNames);
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
