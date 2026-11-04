import { describe, expect, it } from 'vitest';

import { voxelGeometry, writeVoxels } from '@/features/circuit-viewer/morphologies/engine/voxels';

describe('writeVoxels', () => {
  it('takes the view centre off where the boxes are, and leaves their sizes and looks as they came', () => {
    const geometry = voxelGeometry(2);
    writeVoxels(
      {
        centres: Float32Array.of(10, 20, 30, 40, 50, 60),
        sizes: Float32Array.of(1, 2, 3, 4, 5, 6),
        looks: Float32Array.of(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8),
      },
      [10, 10, 10],
      geometry
    );
    expect(Array.from(geometry.getAttribute('aCentre').array)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(Array.from(geometry.getAttribute('aSize').array)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(geometry.getAttribute('aLook').array).toEqual(
      Float32Array.of(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8)
    );
  });

  it('makes a box of faces of their own, so that each can be shaded', () => {
    const geometry = voxelGeometry(1);
    expect(geometry.getAttribute('position').count).toBe(24);
    expect(geometry.getAttribute('normal').count).toBe(24);
    expect(geometry.instanceCount).toBe(1);
  });
});
