import { describe, expect, it } from 'vitest';

import {
  CATEGORICAL_PALETTE,
  SYNAPSE_TYPE_COLORS,
  untypedSynapseColor,
} from '@/features/scan-config/components/color-by/palette';

describe('untypedSynapseColor', () => {
  it('never lands on a synapse type colour', () => {
    const typeColors = new Set<string>(Object.values(SYNAPSE_TYPE_COLORS));
    // Past the palette, so the wrap is covered too.
    const used = Array.from({ length: CATEGORICAL_PALETTE.length * 2 }, (_, i) =>
      untypedSynapseColor(i)
    );

    expect(used.filter((color) => typeColors.has(color))).toEqual([]);
    // Vermillion is a shade off the excitatory orange and cyan off the
    // inhibitory sky blue; keeping them out is the point of the reserved list,
    // and a palette edit must not quietly let them back in.
    expect(used).not.toContain('#d55e00');
    expect(used).not.toContain('#17becf');
  });

  it('gives consecutive untyped populations distinct colours', () => {
    const first = [0, 1, 2].map(untypedSynapseColor);

    expect(new Set(first).size).toBe(3);
  });
});
