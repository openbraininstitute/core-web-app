import { EntityTypeDict } from '@/api/entitycore/types';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSceneMemodel, TSceneSubject } from '@/features/circuit-viewer/circuit-scene';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

/**
 * What a simulation's spikes can be replayed over in 3D, if anything.
 *
 * Nothing is what keeps the 3D and split icons out of the viewer for campaigns
 * that scanned something with no cells to light up — an ion channel, a bare
 * morphology — instead of offering a view that cannot be drawn.
 *
 * Every circuit scale qualifies, and so does an MEModel: a single-neuron
 * campaign scans the model itself rather than a circuit built from it, and its
 * one recorded cell is that model. The viewers behind this draw a cell very
 * differently — a whole neurite tree, a point — but all take a brightness per
 * cell, so which one runs is a rendering detail rather than a limit on what can
 * be replayed.
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
