import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { growRoundDots } from '@/features/circuit-viewer/morphologies/engine/electrodes';
import {
  growRoundVoxels,
  placeOnBox,
  turnToVoxelFrame,
  VoxelOrder,
  voxelGeometry,
  writeVoxels,
} from '@/features/circuit-viewer/morphologies/engine/voxels';

import type { Vec3, VoxelFrame, VoxelLattice } from '@/features/circuit-viewer/morphologies/types';

const NO_LATTICE: VoxelLattice = {
  axes: [0, 1, 2],
  planes: new Uint32Array(0),
  rows: new Uint32Array(0),
};

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
        lattice: NO_LATTICE,
      },
      [0, 0, 0]
    );
    expect(box.min.toArray()).toEqual([-2, -55, -3]);
    expect(box.max.toArray()).toEqual([2, 1, 3]);
  });

  it('reaches every corner of boxes turned from the circuit’s frame, and no further than it must', () => {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.3, -0.7, 1.1));
    const axes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    matrix.extractBasis(axes[0], axes[1], axes[2]);
    const frame = axes.map((axis) => axis.toArray()) as unknown as VoxelFrame;
    const layer = {
      centres: Float32Array.of(10, -20, 30),
      sizes: Float32Array.of(4, 10, 6),
      looks: new Float32Array(4),
      lattice: NO_LATTICE,
      frame,
    };
    const centre: Vec3 = [1, 2, 3];
    const box = new THREE.Box3();
    growRoundVoxels(box, layer, centre);

    const corners = new THREE.Box3();
    for (const sx of [-2, 2]) {
      for (const sy of [-5, 5]) {
        for (const sz of [-3, 3]) {
          corners.expandByPoint(
            new THREE.Vector3(10 + sx, -20 + sy, 30 + sz)
              .applyMatrix4(matrix)
              .sub(new THREE.Vector3(...centre))
          );
        }
      }
    }
    for (const part of [0, 1, 2]) {
      expect(box.min.getComponent(part)).toBeCloseTo(corners.min.getComponent(part), 4);
      expect(box.max.getComponent(part)).toBeCloseTo(corners.max.getComponent(part), 4);
    }
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
        lattice: NO_LATTICE,
      },
      [10, 10, 10],
      Uint32Array.of(0, 1),
      geometry
    );
    expect(Array.from(geometry.getAttribute('aCentre').array)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(Array.from(geometry.getAttribute('aSize').array)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(geometry.getAttribute('aLook').array).toEqual(
      Float32Array.of(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8)
    );
  });

  it('draws a turned layer’s boxes where they are in the circuit, once its mesh is turned', () => {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(2.1, 0.4, -0.9));
    const axes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    matrix.extractBasis(axes[0], axes[1], axes[2]);
    const frame = axes.map((axis) => axis.toArray()) as unknown as VoxelFrame;
    const inLayer = new THREE.Vector3(10, -20, 30);
    const inCircuit = inLayer.clone().applyMatrix4(matrix);
    const centre: Vec3 = [100, 200, 300];
    const geometry = voxelGeometry(1);
    writeVoxels(
      {
        centres: Float32Array.from(inLayer.toArray()),
        sizes: Float32Array.of(1, 1, 1),
        looks: new Float32Array(4),
        lattice: NO_LATTICE,
        frame,
      },
      centre,
      Uint32Array.of(0),
      geometry
    );
    const mesh = new THREE.Mesh();
    turnToVoxelFrame(mesh, frame);
    mesh.updateMatrixWorld();
    const drawn = new THREE.Vector3(
      ...(geometry.getAttribute('aCentre').array as Float32Array)
    ).applyMatrix4(mesh.matrixWorld);
    const expected = inCircuit.sub(new THREE.Vector3(...centre));
    expect(drawn.distanceTo(expected)).toBeLessThan(1e-3);
  });

  it('turns a mesh back once its layer lies along the axes again', () => {
    const mesh = new THREE.Mesh();
    turnToVoxelFrame(mesh, [
      [0, 1, 0],
      [-1, 0, 0],
      [0, 0, 1],
    ]);
    expect(mesh.quaternion.equals(new THREE.Quaternion())).toBe(false);
    turnToVoxelFrame(mesh, null);
    expect(mesh.quaternion.equals(new THREE.Quaternion())).toBe(true);
  });

  it('writes the boxes in the order given', () => {
    const geometry = voxelGeometry(2);
    writeVoxels(
      {
        centres: Float32Array.of(1, 2, 3, 4, 5, 6),
        sizes: Float32Array.of(7, 8, 9, 10, 11, 12),
        looks: Float32Array.of(0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25, 0.25),
        lattice: NO_LATTICE,
      },
      [0, 0, 0],
      Uint32Array.of(1, 0),
      geometry
    );
    expect(Array.from(geometry.getAttribute('aCentre').array)).toEqual([4, 5, 6, 1, 2, 3]);
    expect(Array.from(geometry.getAttribute('aSize').array)).toEqual([10, 11, 12, 7, 8, 9]);
    expect(Array.from(geometry.getAttribute('aLook').array)).toEqual([
      0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5,
    ]);
  });

  it('has only what changed uploaded, and says if anything did', () => {
    const geometry = voxelGeometry(1);
    const layer = {
      centres: Float32Array.of(0.1, 0.2, 0.3),
      sizes: Float32Array.of(1, 2, 3),
      looks: Float32Array.of(0.1, 0.2, 0.3, 0.4),
      lattice: NO_LATTICE,
    };
    const order = Uint32Array.of(0);
    expect(writeVoxels(layer, [0.5, 0.5, 0.5], order, geometry)).toBe(true);
    const versions = () =>
      ['aCentre', 'aSize', 'aLook'].map(
        (name) => (geometry.getAttribute(name) as THREE.BufferAttribute).version
      );
    const written = versions();

    expect(writeVoxels(layer, [0.5, 0.5, 0.5], order, geometry)).toBe(false);
    expect(versions()).toEqual(written);

    const recoloured = { ...layer, looks: Float32Array.of(0.9, 0.2, 0.3, 0.4) };
    expect(writeVoxels(recoloured, [0.5, 0.5, 0.5], order, geometry)).toBe(true);
    expect(versions()).toEqual([written[0], written[1], written[2] + 1]);
  });

  it('makes a box of faces of their own, so that each can be shaded', () => {
    const geometry = voxelGeometry(1);
    expect(geometry.getAttribute('position').count).toBe(24);
    expect(geometry.getAttribute('normal').count).toBe(24);
    expect(geometry.instanceCount).toBe(1);
  });
});

describe('placeOnBox', () => {
  it('puts a unit box over a turned layer’s box, where its mesh draws it, at its size', () => {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(2.1, 0.4, -0.9));
    const axes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    matrix.extractBasis(axes[0], axes[1], axes[2]);
    const frame = axes.map((axis) => axis.toArray()) as unknown as VoxelFrame;
    const centre: Vec3 = [100, 200, 300];
    const layer = {
      centres: Float32Array.of(0, 0, 0, 10, -20, 30),
      sizes: Float32Array.of(1, 1, 1, 4, 6, 8),
      looks: new Float32Array(8),
      lattice: NO_LATTICE,
      frame,
    };
    const outline = new THREE.Object3D();

    placeOnBox(outline, layer, 1, centre);

    outline.updateMatrixWorld();
    const corner = new THREE.Vector3(0.5, 0.5, 0.5).applyMatrix4(outline.matrixWorld);
    const expected = new THREE.Vector3(12, -17, 34)
      .applyMatrix4(matrix)
      .sub(new THREE.Vector3(...centre));
    expect(corner.distanceTo(expected)).toBeLessThan(1e-3);
  });
});

describe('VoxelOrder', () => {
  /** Planes along y, each its own lattice offset from the next, of flat boxes, as the CA1 array is. */
  function offsetPlanes() {
    const size: Vec3 = [94, 44, 94];
    const offsets = [
      [0, 0],
      [37, 11],
      [-23, 52],
    ];
    const centres: number[] = [];
    const planes: number[] = [];
    const rows: number[] = [];
    offsets.forEach(([dx, dz], plane) => {
      planes.push(rows.length);
      for (let x = 0; x < 4; x++) {
        rows.push(centres.length / 3);
        for (let z = 0; z < 4; z++) centres.push(dx + x * 110, plane * 51.3, dz + z * 110);
      }
    });
    planes.push(rows.length);
    rows.push(centres.length / 3);
    return {
      size,
      centres: Float32Array.from(centres),
      lattice: {
        axes: [1, 0, 2] as Vec3,
        planes: Uint32Array.from(planes),
        rows: Uint32Array.from(rows),
      },
    };
  }

  function randoms(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  function eyes(count: number, spread: number, seed = 7): Vec3[] {
    const random = randoms(seed);
    return Array.from({ length: count }, () => [
      (random() - 0.3) * spread,
      (random() - 0.5) * spread,
      (random() - 0.3) * spread,
    ]);
  }

  /** Ray by ray from the eye, how many times a box in front of another is drawn before it. */
  function wrongWayRound(
    layer: ReturnType<typeof offsetPlanes>,
    eye: Vec3,
    order: ArrayLike<number>
  ) {
    const boxes = layer.centres.length / 3;
    const placeOf = new Array<number>(boxes);
    for (let place = 0; place < boxes; place++) placeOf[order[place]] = place;
    const half = new THREE.Vector3(...layer.size).multiplyScalar(0.5);
    const bounds = Array.from({ length: boxes }, (_, box) => {
      const middle = new THREE.Vector3().fromArray(layer.centres, box * 3);
      return new THREE.Box3(middle.clone().sub(half), middle.clone().add(half));
    });
    const from = new THREE.Vector3(...eye);
    const ray = new THREE.Ray();
    const hit = new THREE.Vector3();
    const random = randoms(11);
    let wrong = 0;
    for (let far = 0; far < boxes; far++) {
      for (let sample = 0; sample < 6; sample++) {
        const point = new THREE.Vector3(
          bounds[far].min.x + random() * layer.size[0],
          bounds[far].min.y + random() * layer.size[1],
          bounds[far].min.z + random() * layer.size[2]
        );
        ray.set(from, point.clone().sub(from).normalize());
        const reach = from.distanceTo(point);
        for (let near = 0; near < boxes; near++) {
          if (near === far || placeOf[near] > placeOf[far]) continue;
          if (ray.intersectBox(bounds[near], hit) && from.distanceTo(hit) < reach) wrong++;
        }
      }
    }
    return wrong;
  }

  it.each([
    ['around the array', 4000],
    ['among the boxes', 700],
  ])('blends no box before one behind it, seen from %s', (_, spread) => {
    const layer = offsetPlanes();
    const order = new VoxelOrder(layer);
    for (const eye of eyes(30, spread)) {
      order.seenFrom(eye);
      expect(new Set(order.boxes).size).toBe(layer.centres.length / 3);
      expect(wrongWayRound(layer, eye, order.boxes)).toBe(0);
    }
  });

  it('is what the check finds wrong in boxes left as they come, or in order of their centres', () => {
    const layer = offsetPlanes();
    const boxes = layer.centres.length / 3;
    const asTheyCome = Array.from({ length: boxes }, (_, box) => box);
    const all = eyes(30, 4000);
    expect(
      all.reduce((sum, eye) => sum + wrongWayRound(layer, eye, asTheyCome), 0)
    ).toBeGreaterThan(0);
    const byDistance = (eye: Vec3) =>
      asTheyCome.toSorted((a, b) => {
        const distance = (box: number) =>
          new THREE.Vector3()
            .fromArray(layer.centres, box * 3)
            .distanceTo(new THREE.Vector3(...eye));
        return distance(b) - distance(a);
      });
    expect(
      all.reduce((sum, eye) => sum + wrongWayRound(layer, eye, byDistance(eye)), 0)
    ).toBeGreaterThan(0);
  });

  it('says the order changed only when the eye crosses a gap, and then only', () => {
    const layer = offsetPlanes();
    const order = new VoxelOrder(layer);
    expect(order.seenFrom([60, 300, 60])).toBe(true);
    const before = Array.from(order.boxes);
    // The gaps along x and z are 110 apart, offset by plane, so these move the eye within one cell.
    expect(order.seenFrom([61, 900, 59])).toBe(false);
    expect(Array.from(order.boxes)).toEqual(before);
    expect(order.seenFrom([60, -300, 60])).toBe(true);
    expect(Array.from(order.boxes)).not.toEqual(before);
  });

  it('never keeps an order that a fresh one would differ from', () => {
    const layer = offsetPlanes();
    const kept = new VoxelOrder(layer);
    for (const eye of eyes(300, 1500, 3)) {
      kept.seenFrom(eye);
      const fresh = new VoxelOrder(layer);
      fresh.seenFrom(eye);
      expect(Array.from(kept.boxes)).toEqual(Array.from(fresh.boxes));
    }
  });

  it('has nothing to order in an empty layer', () => {
    const order = new VoxelOrder({
      centres: new Float32Array(0),
      lattice: { axes: [0, 1, 2], planes: Uint32Array.of(0), rows: Uint32Array.of(0) },
    });
    expect(() => order.seenFrom([0, 0, 0])).not.toThrow();
    expect(order.boxes.length).toBe(0);
  });
});
