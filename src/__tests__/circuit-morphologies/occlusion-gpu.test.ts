import { describe, expect, it } from 'vitest';

import { meanSide } from '@/features/circuit-viewer/morphologies/engine/webgpu/occlusion-gpu';

describe("the target the occlusion's mean is taken in", () => {
  it('has a power of two a side, so that each level of its mipmaps is the mean of the one before', () => {
    for (const pixels of [1, 2, 7, 640, 1117, 1600, 2234, 2560, 3456, 5120]) {
      expect(Math.log2(meanSide(pixels)) % 1).toBe(0);
    }
  });

  it("holds the occlusion's every pixel, four a side to one of its own", () => {
    for (const pixels of [1, 2, 7, 640, 1117, 1600, 2234, 2560, 3456, 5120]) {
      expect(meanSide(pixels) * 4).toBeGreaterThanOrEqual(Math.floor(pixels / 2));
    }
  });

  it('is no larger than the next power of two', () => {
    expect([1600, 2048, 2560, 3456].map(meanSide)).toEqual([256, 256, 512, 512]);
  });
});
