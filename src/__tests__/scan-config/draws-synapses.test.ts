import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { circuitDrawsSynapses } from '@/features/scan-config/components/circuit-viz/sources/draws-synapses';

describe('circuitDrawsSynapses', () => {
  it('draws synapses for single-cell circuits', () => {
    expect(circuitDrawsSynapses(CircuitScaleDictionary.Single)).toBe(true);
  });

  it('leaves every larger scale without them', () => {
    expect(circuitDrawsSynapses(CircuitScaleDictionary.PairNeuron)).toBe(false);
    expect(circuitDrawsSynapses(CircuitScaleDictionary.SmallMicrocircuit)).toBe(false);
    expect(circuitDrawsSynapses(CircuitScaleDictionary.Microcircuit)).toBe(false);
    expect(circuitDrawsSynapses(CircuitScaleDictionary.Region)).toBe(false);
    expect(circuitDrawsSynapses(CircuitScaleDictionary.WholeBrain)).toBe(false);
  });
});
