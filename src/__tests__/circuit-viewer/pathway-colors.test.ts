import chroma from 'chroma-js';
import { describe, expect, it } from 'vitest';

import {
  OUTSIDE_PATHWAY_OPACITY,
  PATHWAY_COLORS,
  pathwayNodeColors,
} from '@/features/circuit-viewer/pathway-colors';

describe('pathwayNodeColors', () => {
  const colors = pathwayNodeColors({
    pre: Uint32Array.from([0, 2]),
    post: Uint32Array.from([2, 3, 9]),
    rowCount: 5,
    background: '#ffffff',
  });

  it('colours where the pathway starts green, where it ends red, and both amber', () => {
    const at = (cell: number) => colors.palette[colors.columnByNode[cell]];

    expect(at(0)).toBe(PATHWAY_COLORS.start);
    expect(at(3)).toBe(PATHWAY_COLORS.end);
    expect(at(2)).toBe(PATHWAY_COLORS.both);
  });

  it('draws every other cell faint and flat, and ignores cells past the population', () => {
    expect([...colors.columnByNode]).toEqual([1, 0, 3, 2, 0]);
    expect(colors.flatColumns).toEqual([0]);
  });

  it('draws the cells outside the pathway 5% opaque', () => {
    expect(chroma(colors.palette[0]).alpha()).toBeCloseTo(OUTSIDE_PATHWAY_OPACITY);
    expect(chroma(colors.palette[1]).alpha()).toBe(1);
  });
});
