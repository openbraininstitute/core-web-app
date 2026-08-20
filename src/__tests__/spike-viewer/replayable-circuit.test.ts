import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { replayableCircuit } from '@/features/spike-viewer/spike-replay/replayable-circuit';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

function circuit(scale: string): TSupportedEntitiesForScanConfiguration {
  return { id: 'c1', type: EntityTypeDict.Circuit, scale } as ICircuit;
}

describe('replayableCircuit', () => {
  it.each(
    Object.values(CircuitScaleDictionary)
  )('replays over a %s circuit, whichever way its cells are drawn', (scale) => {
    expect(replayableCircuit(circuit(scale))).not.toBeNull();
  });

  it('has nothing to offer when the campaign scanned something other than a circuit', () => {
    const memodel = {
      id: 'm1',
      type: EntityTypeDict.Memodel,
    } as TSupportedEntitiesForScanConfiguration;

    expect(replayableCircuit(memodel)).toBeNull();
  });

  it('has nothing to offer before the model has loaded', () => {
    expect(replayableCircuit(null)).toBeNull();
  });
});
