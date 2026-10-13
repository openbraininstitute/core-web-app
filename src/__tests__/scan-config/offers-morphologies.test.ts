// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { circuitOffersMorphologies } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';

const OFFERED = { enabled: true, largeCircuit: true, spikes: false, electrodes: false };

describe('circuitOffersMorphologies', () => {
  it('offers them for a circuit drawn as somas, with the flag on', () => {
    expect(circuitOffersMorphologies(OFFERED)).toBe(true);
  });

  it.each([
    ['the flag is off', { enabled: false }],
    ['the circuit is of a scale already drawn as morphologies', { largeCircuit: false }],
    ['spikes are replayed over the cells', { spikes: true }],
    ['the scene holds electrodes', { electrodes: true }],
  ])('offers none where %s', (_, patch) => {
    expect(circuitOffersMorphologies({ ...OFFERED, ...patch })).toBe(false);
  });
});
