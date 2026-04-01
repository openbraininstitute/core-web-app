import React from 'react';

import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron';

import type { MorphoViewerSpikeRecord } from '@bbp/morphoviewer';
import type { PlotData } from '@/services/bluenaas-single-cell/types';

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
