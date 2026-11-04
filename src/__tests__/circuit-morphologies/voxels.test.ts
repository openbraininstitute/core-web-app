import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { growRoundDots } from '@/features/circuit-viewer/morphologies/engine/electrodes';
import {
  growRoundVoxels,
  voxelGeometry,
  writeVoxels,
} from '@/features/circuit-viewer/morphologies/engine/voxels';

describe('the box round what is drawn beside the cells', () => {
  const cells = () => new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));

  it('reaches the dots, each with its radius, about the view centre', () => {
    const box = cells();
    growRoundDots(
      box,
      [{ color: '#000', coordinates: Float32Array.of(110, 5, 10, 90, 5, 10) }],
      [10, 5, 10],
      2
    );
    expect(box.max.toArray()).toEqual([102, 2, 2]);
    expect(box.min.toArray()).toEqual([-1, -2, -2]);
  });

  it('reaches the boxes, each with its half width along each axis', () => {
    const box = cells();
    growRoundVoxels(
      box,
      {
        centres: Float32Array.of(0, -50, 0),
        sizes: Float32Array.of(4, 10, 6),
        looks: new Float32Array(4),
      },
      [0, 0, 0]
    );
    expect(box.min.toArray()).toEqual([-2, -55, -3]);
    expect(box.max.toArray()).toEqual([2, 1, 3]);
  });

  it('starts from nothing where there are no cells', () => {
    const box = new THREE.Box3();
    growRoundDots(box, [{ color: '#000', coordinates: Float32Array.of(5, 6, 7) }], [0, 0, 0], 1);
    expect(box.isEmpty()).toBe(false);
    expect(box.min.toArray()).toEqual([4, 5, 6]);
  });
});

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

  it('has only what changed uploaded, and says if anything did', () => {
    const geometry = voxelGeometry(1);
    const layer = {
      centres: Float32Array.of(0.1, 0.2, 0.3),
      sizes: Float32Array.of(1, 2, 3),
      looks: Float32Array.of(0.1, 0.2, 0.3, 0.4),
    };
    expect(writeVoxels(layer, [0.5, 0.5, 0.5], geometry)).toBe(true);
    const versions = () =>
      ['aCentre', 'aSize', 'aLook'].map(
        (name) => (geometry.getAttribute(name) as THREE.BufferAttribute).version
      );
    const written = versions();

    expect(writeVoxels(layer, [0.5, 0.5, 0.5], geometry)).toBe(false);
    expect(versions()).toEqual(written);

    const recoloured = { ...layer, looks: Float32Array.of(0.9, 0.2, 0.3, 0.4) };
    expect(writeVoxels(recoloured, [0.5, 0.5, 0.5], geometry)).toBe(true);
    expect(versions()).toEqual([written[0], written[1], written[2] + 1]);
  });

  it('makes a box of faces of their own, so that each can be shaded', () => {
    const geometry = voxelGeometry(1);
    expect(geometry.getAttribute('position').count).toBe(24);
    expect(geometry.getAttribute('normal').count).toBe(24);
    expect(geometry.instanceCount).toBe(1);
  });
});
