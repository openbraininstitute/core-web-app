// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildParams,
  DEFAULT_BUILD,
} from '@/features/entities/cell-morphology/morpho-viewer/constants';
import { DEFAULT_TUBE_ASPECT } from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import { UNTANGLE_VOXELS } from '@/features/entities/cell-morphology/morpho-viewer/engine/untangle';

const VOXEL = 10 ** -0.9;

describe('buildParams', () => {
  it('gives the defaults the parameters the viewer has always built with', () => {
    expect(buildParams(DEFAULT_BUILD, [2, 3])).toEqual({
      smoothing: 1,
      axonRadius: 'heavy',
      axonStep: 5,
      simplify: 0.5 * VOXEL,
      voxel: VOXEL,
      blend: 0.1,
      somaBlend: 1,
      minRadius: VOXEL,
      includeTypes: [2, 3],
      simplifyMesh: VOXEL,
      tubeAspect: DEFAULT_TUBE_ASPECT,
      untangle: UNTANGLE_VOXELS * VOXEL,
    });
  });

  it('scales what is given in voxels by the voxel, and leaves the rest', () => {
    const params = buildParams(
      { ...DEFAULT_BUILD, voxel: 0.5, simplify: 2, minRadius: 1.5, simplifyMesh: 0.5, blend: 0.3 },
      []
    );
    expect(params).toMatchObject({
      voxel: 0.5,
      simplify: 1,
      minRadius: 0.75,
      simplifyMesh: 0.25,
      untangle: UNTANGLE_VOXELS * 0.5,
      blend: 0.3,
    });
  });

  it('untangles nothing when untangling is off', () => {
    expect(buildParams({ ...DEFAULT_BUILD, untangle: false }, []).untangle).toBe(0);
  });
});
