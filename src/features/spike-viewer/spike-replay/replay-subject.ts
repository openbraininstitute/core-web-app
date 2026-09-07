import { EntityTypeDict } from '@/api/entitycore/types';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSceneMemodel, TSceneSubject } from '@/features/circuit-viewer/circuit-scene';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

/**
 * What a simulation's spikes can be replayed over in 3D, if anything. Every
 * circuit scale qualifies, and so does an MEModel: a single-neuron campaign
 * scans the model itself rather than a circuit built from it, so its one
 * recorded cell is that model.
 */
export function replaySubject(
  model: TSupportedEntitiesForScanConfiguration | null
): TSceneSubject | undefined {
  switch (model?.type) {
    case EntityTypeDict.Circuit:
      return { circuit: model as ICircuit };
    case EntityTypeDict.Memodel:
      return { memodel: model as TSceneMemodel };
    default:
      return undefined;
  }
}
