import { describe, expect, it } from 'vitest';

import { placementAt } from '@/features/circuit-nodes/geometry-utils';

import type { NodeGeometry } from '@/features/circuit-nodes/types';

describe('a node placed', () => {
  it('is turned by its orientation made of unit length, as the viewer turns its morphology', () => {
    const geometry = {
      count: 2,
      positions: Float32Array.of(1, 2, 3, 4, 5, 6),
      orientations: Float32Array.of(0, 0, 2, 0, 0, 0, 0, 0),
    } as NodeGeometry;
    expect(placementAt(geometry, 0)).toEqual({ center: [1, 2, 3], orientation: [0, 0, 1, 0] });
    // No length to make: no rotation.
    expect(placementAt(geometry, 1)?.orientation).toEqual([0, 0, 0, 1]);
    expect(placementAt(geometry, 2)).toBeNull();
  });
});
