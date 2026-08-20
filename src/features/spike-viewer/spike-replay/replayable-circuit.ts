import { EntityTypeDict } from '@/api/entitycore/types';
import { circuitDrawsMorphologies } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

/**
 * The circuit a simulation's spikes can be replayed over, or `null`.
 *
 * `null` is what keeps the 3D and split icons out of the viewer for campaigns
 * that scanned something else — an ion channel, a single cell — instead of
 * offering a view that cannot be drawn. Circuits too large to draw as
 * morphologies are refused for the same reason: a soma point cloud has no
 * per-cell channel to fade, so there is nothing to light up yet.
 */
export function replayableCircuit(
  model: TSupportedEntitiesForScanConfiguration | null
): ICircuit | null {
  if (!model || model.type !== EntityTypeDict.Circuit) return null;

  const circuit = model as ICircuit;
  return circuitDrawsMorphologies(circuit.scale) ? circuit : null;
}
