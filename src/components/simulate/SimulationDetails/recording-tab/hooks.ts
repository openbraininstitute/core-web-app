import {
  type MorphoViewerSpikeRecord,
  type MorphoViewerTree,
  morphoViewerConvertMorphologyIntoTree,
} from '@bbp/morphoviewer';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { getSingleNeuronMorphology } from '@/api/small-scale-simulator';
import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { logError } from '@/utils/logger';

import type { PlotData } from '@/services/bluenaas-single-cell/types';

export function useMorphology(meModelId: string): MorphoViewerTree | undefined {
  const { virtualLabId, projectId } = useWorkspace();
  const {
    isLoading: loading,
    error,
    data,
  } = useQuery({
    queryKey: keyBuilder.neuronMorphology3DData({ virtualLabId, projectId, modelId: meModelId }),
    queryFn: () => {
      return getSingleNeuronMorphology({ ctx: { virtualLabId, projectId }, meModelId });
    },
  });

  const tree = React.useMemo(() => {
    if (!data) return undefined;

    return morphoViewerConvertMorphologyIntoTree(data, 'Cell');
  }, [data]);
  if (error) {
    logError(`Unable to load morphology for me-model "${meModelId}":`, error);
    return undefined;
  }

  return loading ? undefined : tree;
}

const SEC_PER_MSEC = 1e-3;

export function useSpikes(recordings: Record<string, PlotData>): MorphoViewerSpikeRecord[] {
  return React.useMemo(() => {
    const spikes: MorphoViewerSpikeRecord[] = [];
    const recordingName: string = getFirstRecordingName(recordings);
    const recording = recordings[recordingName];
    let colorIndex = 0;
    for (const stimulus of recording) {
      const rec: MorphoViewerSpikeRecord = {
        color: SIMULATION_COLORS[colorIndex++],
        label: stimulus.name,
        spikesInSeconds: (stimulus.spike_times ?? []).map((value) => value * SEC_PER_MSEC),
        timeMinInSeconds: stimulus.x[0] * SEC_PER_MSEC,
        timeMaxInSeconds: stimulus.x[stimulus.x.length - 1] * SEC_PER_MSEC,
      };
      spikes.push(rec);
    }
    return spikes;
  }, [recordings]);
}

function getFirstRecordingName(recordings: Record<string, PlotData>): string {
  const names = Object.keys(recordings)
    .map((name) => `${name.startsWith('soma') ? '0' : '1'}${name}`)
    .sort()
    .map((name) => name.slice(1));
  return names[0];
}
