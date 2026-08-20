import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

/**
 * Scales whose cells the 3D replay can light up one at a time.
 *
 * Everything larger draws somas as a point cloud, which has no per-cell channel
 * to fade — see the somas-only half of prod-circuit-simulation#159.
 */
const REPLAYABLE_SCALES: readonly string[] = [
  CircuitScaleDictionary.Single,
  CircuitScaleDictionary.PairNeuron,
  CircuitScaleDictionary.SmallMicrocircuit,
];

/**
 * The circuit a simulation's spikes can be replayed over, or `null`.
 *
 * `null` is what keeps the 3D and split icons out of the viewer for campaigns
 * that scanned something else — an ion channel, a single cell — instead of
 * offering a view that cannot be drawn.
 */
export function replayableCircuit(
  model: TSupportedEntitiesForScanConfiguration | null
): ICircuit | null {
  if (!model || model.type !== EntityTypeDict.Circuit) return null;

  const circuit = model as ICircuit;
  return REPLAYABLE_SCALES.includes(circuit.scale) ? circuit : null;
}
