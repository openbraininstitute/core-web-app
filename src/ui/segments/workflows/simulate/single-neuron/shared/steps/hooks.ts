import { useQuery } from '@tanstack/react-query';
import { useAtom, useSetAtom } from 'jotai';
import React from 'react';

import { getSingleNeuronMorphology } from '@/api/small-scale-simulator';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  ExperimentalSetupConfigurationAtomFamily,
  genericSingleNeuronSimulationPlotDataAtomFamily,
  neuronSectionNamesAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { Morphology } from '@/services/bluenaas-single-cell/types';
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
    console.log('🐞 [hooks@39] rawData =', rawData); // @FIXME: Remove this line written on 2026-03-31 at 13:49
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

  const toggleFullscreen = React.useCallback(async () => {
    if (typeof window === 'undefined') return;
    const { tgdFullscreenToggle } = await import('@tolokoban/tgd');
    tgdFullscreenToggle(refContainer.current);
  }, []);

  return { refContainer, toggleFullscreen };
}

export function useCleanMorphology(meModelId: string, sessionId: string) {
  const { virtualLabId, projectId } = useWorkspace();
  const setSecNames = useSetAtom(neuronSectionNamesAtomFamily(sessionId));

  const {
    isLoading: loading,
    isSuccess,
    error,
    data,
  } = useQuery({
    queryKey: keyBuilder.neuronMorphology3DData({ virtualLabId, projectId, modelId: meModelId }),
    queryFn: () => {
      return getSingleNeuronMorphology({ ctx: { virtualLabId, projectId }, meModelId });
    },
  });

  const morphology: Morphology = isSuccess && data ? removeNoDiameterSection(data) : {};
  const sectionNames = Object.keys(morphology);
  setSecNames(sectionNames);

  return { loading, error, morphology };
}

function removeNoDiameterSection(morphology: Morphology) {
  const pruned = Object.entries(morphology).reduce((acc: Morphology, [secName, sec]) => {
    if (!sec.diam) return acc;

    acc[secName] = sec;
    return acc;
  }, {});
  return pruned satisfies Morphology;
}
