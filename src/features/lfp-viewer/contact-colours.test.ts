import { describe, expect, it } from 'vitest';

import { PICK_COLORS, TRACE_COLORS } from '@/features/sonata-viewer/constants';
import { togglePickIn } from '@/features/sonata-viewer/trace-picks';

import { lineColour, pickColours, SELECTED_COLOUR } from './contact-colours';

describe('pickColours', () => {
  it('keeps a ticked contact its colour as others are unticked', () => {
    const picks = togglePickIn(togglePickIn(togglePickIn([], 7), 3), 9);
    const colours = pickColours(togglePickIn(picks, 3));

    expect(colours.get(7)).toBe(TRACE_COLORS[0]);
    expect(colours.get(9)).toBe(TRACE_COLORS[2]);
    expect(colours.has(3)).toBe(false);
  });
});

describe('lineColour', () => {
  it("gives a ticked contact its own, the selected one the traces' and others one by place", () => {
    const colourOf = lineColour(new Map([[4, '#123456']]), 2);

    expect(colourOf(4, 0)).toBe('#123456');
    expect(colourOf(2, 0)).toBe(SELECTED_COLOUR);
    expect(colourOf(5, 1)).toBe(PICK_COLORS[1]);
  });
});
