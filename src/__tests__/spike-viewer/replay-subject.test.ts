import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { replaySubject } from '@/features/spike-viewer/spike-replay/replay-subject';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

function circuit(scale: string): TSupportedEntitiesForScanConfiguration {
  return { id: 'c1', type: EntityTypeDict.Circuit, scale } as ICircuit;
}

describe('replaySubject', () => {
  it.each(
    Object.values(CircuitScaleDictionary)
  )('replays over a %s circuit, whichever way its cells are drawn', (scale) => {
    expect(replaySubject(circuit(scale))).toEqual({ circuit: circuit(scale) });
  });

  it('replays over the MEModel a single-neuron campaign scanned', () => {
    const memodel = {
      id: 'm1',
      name: 'ME-model',
      type: EntityTypeDict.Memodel,
    } as TSupportedEntitiesForScanConfiguration;

    expect(replaySubject(memodel)).toEqual({ memodel });
  });

  it('has nothing to offer when the campaign scanned something with no cells to light up', () => {
    const ionChannel = {
      id: 'i1',
      type: EntityTypeDict.IonChannelModel,
    } as TSupportedEntitiesForScanConfiguration;

    expect(replaySubject(ionChannel)).toBeUndefined();
  });

  it('has nothing to offer before the model has loaded', () => {
    expect(replaySubject(null)).toBeUndefined();
  });
});
