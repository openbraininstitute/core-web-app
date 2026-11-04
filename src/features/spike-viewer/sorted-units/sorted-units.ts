import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ELECTRODE_PALETTE } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { withSimulationTimeWindow } from '@/features/spike-viewer/time-window';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

export const SPIKES_FILE = 'spikes.h5';
export const RECORDINGS_FILE = 'recordings.json';

/** A sorted recording, as the sort task writes it to `recordings.json`. */
export type SortedRecording = {
  duration_ms: number;
  channel_ids: string[];
  electrode_positions: number[][];
};

export type SortedRecordings = Record<string, SortedRecording>;

/** The palette's black: the units are drawn in blues, which its blue would be lost among. */
const ELECTRODE_COLOR = ELECTRODE_PALETTE[3];

/**
 * A sorting result as the circuit the viewers draw: the sort task writes its units as SONATA node
 * populations beside a `circuit_config.json`, so the viewers need only look there for the files.
 * The scale draws each unit as a soma, and the type says whose assets they are.
 */
export function sortedUnitsCircuit(result: IEntity, asset: IAsset): ICircuit {
  return {
    ...result,
    type: EntityTypeDict.TaskResult,
    scale: CircuitScaleDictionary.Microcircuit,
    assets: [{ ...asset, label: AssetLabel.sonata_circuit }],
  } as unknown as ICircuit;
}

/** The electrodes of each recording, for the scene. */
export function electrodeOverlays(
  recordings: SortedRecordings
): Record<string, ICircuitOverlayGroup[]> {
  return Object.fromEntries(
    Object.entries(recordings).map(([name, recording]) => [
      name,
      [
        {
          name: 'Electrodes',
          id: 'electrodes',
          kind: 'electrodes' as const,
          color: ELECTRODE_COLOR,
          coordinates: Float32Array.from(recording.electrode_positions.flat()),
        },
      ],
    ])
  );
}

/** The spikes over the whole of the longest recording, rather than first spike to last. */
export function withRecordingSpan(spikes: SpikeData, recordings: SortedRecordings): SpikeData {
  const durations = Object.values(recordings).map((recording) => recording.duration_ms);
  return withSimulationTimeWindow(spikes, { tstart: 0, tstop: Math.max(...durations) });
}
