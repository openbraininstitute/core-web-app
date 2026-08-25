import { EntityTypeDict } from '@/api/entitycore/types';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

/**
 * The circuit a simulation's spikes can be replayed over, or `null`.
 *
 * `null` is what keeps the 3D and split icons out of the viewer for campaigns
 * that scanned something else — an ion channel, a single cell — instead of
 * offering a view that cannot be drawn.
 *
 * Every circuit scale qualifies. The two viewers behind this draw a cell very
 * differently — one a whole neurite tree, the other a point — but both take a
 * brightness per cell, so which one runs is a rendering detail rather than a
 * limit on what can be replayed.
 */
export function replayableCircuit(
  model: TSupportedEntitiesForScanConfiguration | null
): ICircuit | null {
  if (!model || model.type !== EntityTypeDict.Circuit) return null;

  return model as ICircuit;
}
