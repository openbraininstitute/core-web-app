// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  distanceFor,
  fitHalfHeight,
  fogRange,
  halfHeightAt,
  orthoClip,
  orthoPixelScale,
} from '@/features/viewer-3d/engine/camera';

describe('projection switch', () => {
  it('keeps how large the cell is at the target, there and back', () => {
    for (const d of [0.5, 40, 1200]) {
      const half = halfHeightAt(d, 45);
      expect(half).toBeCloseTo(d * Math.tan(Math.PI / 8), 9);
      expect(distanceFor(half, 45)).toBeCloseTo(d, 9);
    }
  });

  it('frames the side that reaches farthest on screen, over the width or the height', () => {
    // A cell 200 µm tall and 100 µm wide in a square view: the height decides.
    expect(fitHalfHeight([0, 100, 0, 50, -20, 30], 1, 0.5)).toBe(200);
    // In a view twice as wide as high a 300 µm reach sideways fits in a half-height of 150.
    expect(fitHalfHeight([300, 10, 0], 2, 1)).toBe(150);
    // Depth does not matter to an orthographic view.
    expect(fitHalfHeight([0, 10, 5000], 1, 1)).toBe(10);
    expect(fitHalfHeight([], 1, 1)).toBe(0);
  });
});

describe('orthographic view', () => {
  it('measures microns per CSS pixel through the zoom', () => {
    expect(orthoPixelScale(150, -150, 1, 300)).toBe(1);
    expect(orthoPixelScale(150, -150, 4, 300)).toBe(0.25);
  });

  it('clips around the scene from anywhere, the near plane behind the camera if need be', () => {
    expect(orthoClip(1000, 100)).toEqual({ near: 895, far: 1105 });
    const inside = orthoClip(10, 100);
    expect(inside.near).toBeLessThan(0);
    expect(inside.far).toBeCloseTo(115, 9);
  });

  it('keeps the depth cue where perspective has it, and follows the zoom where the distance does not', () => {
    const perspective = fogRange(100, 100);
    expect(perspective.near).toBeCloseTo(55, 9);
    expect(perspective.far).toBeCloseTo(190, 9);
    // Zoomed in fourfold from 100 µm out: the fog closes around the target.
    const zoomed = fogRange(100, 25);
    expect(zoomed.near).toBeCloseTo(88.75, 9);
    expect(zoomed.far).toBeCloseTo(122.5, 9);
  });
});
