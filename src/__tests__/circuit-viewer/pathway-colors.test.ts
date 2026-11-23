import chroma from 'chroma-js';
import { describe, expect, it } from 'vitest';

import {
  OUTSIDE_PATHWAY_OPACITY,
  pathwayColors,
  pathwayNodeColors,
} from '@/features/circuit-viewer/pathway-colors';
import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';

describe('pathwayNodeColors', () => {
  const colors = pathwayNodeColors({
    pre: Uint32Array.from([0, 2]),
    post: Uint32Array.from([2, 3, 9]),
    rowCount: 5,
    background: CANVAS_LIGHT,
  });

  it('colours where the pathway starts, where it ends, and both, in the canvas colours', () => {
    const at = (cell: number) => colors.palette[colors.columnByNode[cell]];
    const light = pathwayColors(CANVAS_LIGHT);

    expect(at(0)).toBe(light.start);
    expect(at(3)).toBe(light.end);
    expect(at(2)).toBe(light.both);
  });

  it('takes the steps for the dark canvas on it, never red against green', () => {
    expect(pathwayColors(CANVAS_DARK)).not.toEqual(pathwayColors(CANVAS_LIGHT));
    for (const canvas of [CANVAS_LIGHT, CANVAS_DARK]) {
      const { start, end, both } = pathwayColors(canvas);
      // blue, orange and aqua by hue
      expect(chroma(start).get('oklch.h')).toBeGreaterThan(230);
      expect(chroma(end).get('oklch.h')).toBeLessThan(60);
      expect(chroma(both).get('oklch.h')).toBeGreaterThan(140);
      expect(chroma(both).get('oklch.h')).toBeLessThan(180);
    }
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
