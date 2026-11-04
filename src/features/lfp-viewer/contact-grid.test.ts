import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { inVoxelFrame, VoxelOrder } from '@/features/circuit-viewer/morphologies/engine/voxels';
import { levelOf, SCENE_LEVELS } from '@/features/lfp-viewer/colour-scale';
import {
  contactGrid,
  gridAxisNames,
  openingSliceAxis,
  placeVoxels,
  sliceLabel,
  slicePosition,
  voxelsOf,
} from '@/features/lfp-viewer/contact-grid';

import type { Vec3 } from '@/features/circuit-viewer/morphologies/types';
import type { ContactGrid } from '@/features/lfp-viewer/contact-grid';

function lattice(nx: number, ny: number, nz: number, step: [number, number, number]) {
  const points: number[] = [];
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) points.push(x * step[0], y * step[1], z * step[2]);
    }
  }
  return Float32Array.from(points);
}

/** Depth planes of a lattice of their own, each with another offset and footprint, as the CA1 array is. */
function offsetPlanes() {
  const offsets = [
    [0, 0],
    [37, 11],
    [-23, 52],
    [71, -41],
    [12, 88],
    [-55, 19],
  ];
  const points: number[] = [];
  offsets.forEach(([dx, dz], plane) => {
    for (let x = 0; x < 8 - (plane % 2); x++) {
      for (let z = 0; z < 6; z++) points.push(dx + x * 110, plane * 51.3, dz + z * 110);
    }
  });
  return Float32Array.from(points);
}

describe('contactGrid', () => {
  it('reads a regular lattice', () => {
    const grid = contactGrid(lattice(6, 5, 7, [20, 30, 40]));
    expect(grid?.pitch).toEqual([20, 30, 40]);
    expect(grid?.slices).toEqual([6, 5, 7]);
    expect(grid?.places.map((places) => places[0])).toEqual([0, 0, 0]);
  });

  it('reads the planes of a stack whose lattices are offset from each other', () => {
    const grid = contactGrid(offsetPlanes());
    expect(grid?.pitch[0]).toBeCloseTo(110, 3);
    expect(grid?.pitch[1]).toBeCloseTo(51.3, 3);
    expect(grid?.pitch[2]).toBeCloseTo(110, 3);
    expect(grid?.slices[1]).toBe(6);
  });

  it('puts every contact in a slice along every axis, and leaves none of them empty', () => {
    const positions = offsetPlanes();
    const grid = contactGrid(positions);
    expect(grid).not.toBeNull();
    for (let axis = 0; axis < 3; axis++) {
      const counts = new Array<number>(grid?.slices[axis] ?? 0).fill(0);
      for (const slice of grid?.sliceOf[axis] ?? []) counts[slice]++;
      expect(counts.reduce((a, b) => a + b, 0)).toBe(positions.length / 3);
      expect(counts.every((count) => count > 0)).toBe(true);
    }
  });

  it('reads a single plane, its thickness the finer step', () => {
    const grid = contactGrid(lattice(6, 8, 1, [20, 30, 0]));
    expect(grid?.pitch).toEqual([20, 30, 20]);
    expect(grid?.slices).toEqual([6, 8, 1]);
  });

  it('has no grid of a probe, in one line or a few columns', () => {
    expect(contactGrid(lattice(1, 16, 1, [0, 20, 0]))).toBeNull();
    expect(contactGrid(lattice(4, 96, 1, [16, 20, 0]))).toBeNull();
  });

  it('has no grid of scattered contacts', () => {
    const scattered = Float32Array.from({ length: 300 }, (_, i) => (i * 7919.13) % 1000);
    expect(contactGrid(scattered)).toBeNull();
  });

  it('keeps the contacts as they came, with no frame, where the grid lies along the axes', () => {
    const positions = lattice(6, 5, 7, [20, 30, 40]);
    const grid = contactGrid(positions);
    expect(grid?.frame).toBeNull();
    expect(grid?.positions).toBe(positions);
  });

  it('has no grid of nothing', () => {
    expect(contactGrid(new Float32Array(0))).toBeNull();
  });

  it('opens its slices along the axis with the fewest, passing over a single plane', () => {
    const stack = contactGrid(lattice(9, 5, 7, [20, 30, 40]));
    expect(stack && openingSliceAxis(stack)).toBe(1);
    const plane = contactGrid(lattice(6, 8, 1, [20, 30, 0]));
    expect(plane && openingSliceAxis(plane)).toBe(0);
  });
});

describe('contactGrid, on what a real array may hold', () => {
  function planes(zs: number[]) {
    const points: number[] = [];
    for (const z of zs) {
      for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 6; y++) points.push(x * 20, y * 30, z);
      }
    }
    return Float32Array.from(points);
  }

  it('gives each plane of a stack its own slice, however far apart they are', () => {
    const zs = [0, 100, 150, 200, 500];
    const grid = contactGrid(planes(zs));
    expect(grid?.slices[2]).toBe(zs.length);
    expect(grid?.places[2]).toEqual(zs);
    expect(new Set(grid?.sliceOf[2]).size).toBe(zs.length);
  });

  it.each([
    55, 54,
  ])('keeps a column whole where its plane is offset by about half a step: %d µm of 110', (offset) => {
    const points: number[] = [];
    for (let plane = 0; plane < 2; plane++) {
      for (let x = 0; x < 6; x++) {
        for (let z = 0; z < 6; z++) {
          const jitter = z % 2 === 0 ? 0.01 : -0.01;
          points.push(plane * offset + x * 110 + (plane === 1 ? jitter : 0), plane * 50, z * 110);
        }
      }
    }
    const grid = contactGrid(Float32Array.from(points));
    if (!grid) throw new Error('no grid');
    const column = Array.from({ length: 6 }, (_, z) => grid.sliceOf[0][36 + z]);
    expect(new Set(column).size).toBe(1);
  });

  it('keeps a row whole where it lies on a rounding boundary', () => {
    const points: number[] = [];
    for (let plane = 0; plane < 2; plane++) {
      for (let x = 0; x < 6; x++) {
        for (let z = 0; z < 6; z++) {
          const jitter = x % 2 === 0 ? 0.01 : -0.01;
          points.push(x * 20, plane * 50, 10.5 + z * 30 + jitter);
        }
      }
    }
    const grid = contactGrid(Float32Array.from(points));
    expect(grid?.pitch[0]).toBeCloseTo(20, 3);
    expect(grid?.pitch[2]).toBeCloseTo(30, 1);
  });
});

describe('contactGrid, on a grid turned off the axes', () => {
  const TURNS: [number, number, number][] = [
    [0, 0, 0.5],
    [0.5, 0, 0],
    [0.3, -0.7, 1.1],
    [2.1, 0.4, -0.9],
    [-1.3, 1.2, 0.2],
  ];

  function turned(points: Float32Array, turn: [number, number, number]) {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...turn));
    const out = new Float32Array(points.length);
    const point = new THREE.Vector3();
    for (let c = 0; c < points.length; c += 3) {
      point.set(points[c], points[c + 1], points[c + 2]).applyMatrix4(matrix);
      out.set([point.x + 3800, point.y - 900, point.z - 2700], c);
    }
    return out;
  }

  /** The array of a real report: 6 x 6 x 6 at 108 µm, its steps as they are in its file. */
  function reportCube() {
    const steps: [number, number, number][] = [
      [64.48, -15.14, 85.31],
      [45.19, -84.85, -49.22],
      [-73.92, -65.08, 44.32],
    ];
    const points: number[] = [];
    for (let k = 0; k < 6; k++) {
      for (let j = 0; j < 6; j++) {
        for (let i = 0; i < 6; i++) {
          for (let axis = 0; axis < 3; axis++) {
            points.push(
              [3829.72, -831.91, -2697.09][axis] +
                i * steps[1][axis] +
                j * steps[0][axis] +
                k * steps[2][axis]
            );
          }
        }
      }
    }
    return Float32Array.from(points);
  }

  function expectSquareAndFaithful(grid: ContactGrid | null, positions: Float32Array) {
    if (!grid?.frame) throw new Error('no turned grid');
    const [a, b, c] = grid.frame.map((axis) => new THREE.Vector3(...axis));
    expect(a.length()).toBeCloseTo(1, 5);
    expect(b.length()).toBeCloseTo(1, 5);
    expect(a.dot(b)).toBeCloseTo(0, 5);
    expect(a.clone().cross(b).dot(c)).toBeCloseTo(1, 5);
    for (let i = 0; i < positions.length; i += 3) {
      const back = a
        .clone()
        .multiplyScalar(grid.positions[i])
        .addScaledVector(b, grid.positions[i + 1])
        .addScaledVector(c, grid.positions[i + 2]);
      expect(back.distanceTo(new THREE.Vector3(...positions.subarray(i, i + 3)))).toBeLessThan(
        0.01
      );
    }
  }

  const sorted = (values: readonly number[]) => [...values].sort((a, b) => a - b);

  it('reads the array of the real report', () => {
    const positions = reportCube();
    const grid = contactGrid(positions);
    expect(grid?.slices).toEqual([6, 6, 6]);
    for (const step of grid?.pitch ?? []) expect(step).toBeCloseTo(108, 1);
    expectSquareAndFaithful(grid, positions);
  });

  it.each(TURNS)('reads a cube turned by %d, %d, %d', (...turn) => {
    const positions = turned(lattice(6, 6, 6, [108, 108, 108]), turn);
    const grid = contactGrid(positions);
    expect(grid?.slices).toEqual([6, 6, 6]);
    expectSquareAndFaithful(grid, positions);
  });

  it.each(TURNS)('reads a lattice of three steps turned by %d, %d, %d', (...turn) => {
    const positions = turned(lattice(6, 5, 7, [20, 30, 40]), turn);
    const grid = contactGrid(positions);
    expect(sorted(grid?.slices ?? [])).toEqual([5, 6, 7]);
    expect(sorted(grid?.pitch ?? []).map((step) => Math.round(step))).toEqual([20, 30, 40]);
    expectSquareAndFaithful(grid, positions);
  });

  it.each(TURNS)('reads a stack of offset planes turned by %d, %d, %d', (...turn) => {
    const positions = turned(offsetPlanes(), turn);
    const grid = contactGrid(positions);
    expect(sorted(grid?.pitch ?? []).map((step) => Math.round(step))).toEqual([51, 110, 110]);
    expect(grid?.slices[grid.stack]).toBe(6);
    expectSquareAndFaithful(grid, positions);
  });

  it.each(TURNS)('reads a single plane turned by %d, %d, %d', (...turn) => {
    const positions = turned(lattice(6, 8, 1, [20, 30, 0]), turn);
    const grid = contactGrid(positions);
    expect(sorted(grid?.slices ?? [])).toEqual([1, 6, 8]);
    expectSquareAndFaithful(grid, positions);
  });

  it.each(TURNS)('has no grid of a probe turned by %d, %d, %d', (...turn) => {
    expect(contactGrid(turned(lattice(1, 16, 1, [0, 20, 0]), turn))).toBeNull();
    expect(contactGrid(turned(lattice(4, 96, 1, [16, 20, 0]), turn))).toBeNull();
  });

  it('finds the same frame whatever order the contacts come in', () => {
    const positions = turned(lattice(6, 6, 6, [108, 108, 108]), TURNS[2]);
    const reversed = new Float32Array(positions.length);
    const contacts = positions.length / 3;
    for (let contact = 0; contact < contacts; contact++) {
      const from = contacts - 1 - contact;
      reversed.set(positions.subarray(from * 3, from * 3 + 3), contact * 3);
    }
    const [one, other] = [contactGrid(positions)?.frame, contactGrid(reversed)?.frame];
    if (!one || !other) throw new Error('no frame');
    for (let axis = 0; axis < 3; axis++) {
      for (let part = 0; part < 3; part++) {
        expect(one[axis][part]).toBeCloseTo(other[axis][part], 4);
      }
    }
  });

  it('names its axes and slices apart from the circuit’s', () => {
    const grid = contactGrid(turned(lattice(6, 6, 6, [108, 108, 108]), TURNS[2]));
    if (!grid) throw new Error('no grid');
    expect(gridAxisNames(grid)).toEqual(['a', 'b', 'c']);
    expect(sliceLabel(grid, { axis: 1, index: 2 })).toBe('Plane 3 of 6');

    const along = contactGrid(lattice(6, 5, 7, [20, 30, 40]));
    if (!along) throw new Error('no grid');
    expect(gridAxisNames(along)).toEqual(['x', 'y', 'z']);
    expect(sliceLabel(along, { axis: 1, index: 2 })).toBe('y = 60 µm');
  });

  it('puts every contact in a tile on the plane of its slice, along each of the grid’s axes', () => {
    const positions = reportCube();
    const grid = contactGrid(positions);
    if (!grid) throw new Error('no grid');
    for (const axis of [0, 1, 2]) {
      const seen = new Set<number>();
      for (let index = 0; index < 6; index++) {
        const slice = { axis, index };
        const { centres, frame, shown } = placeVoxels(grid, slice);
        expect(frame).toBe(grid.frame);
        expect(shown.length).toBe(36);
        for (const contact of shown) seen.add(contact);
        for (let i = axis; i < centres.length; i += 3) {
          expect(centres[i]).toBeCloseTo(slicePosition(grid, slice), 2);
        }
      }
      expect(seen.size).toBe(216);
    }
  });

  it.each([[[1e8, 3e7, -5e7]], [[-2e7, 9e7, 4e7]], [[4000, -1200, -2500]]] as [
    Vec3,
  ][])('draws the nearer of two boxes side by side later, seen from %j, by distances in the circuit', (eye) => {
    const positions = reportCube();
    const grid = contactGrid(positions);
    if (!grid) throw new Error('no grid');
    const { shown, centres, lattice: nesting, frame } = placeVoxels(grid, null);
    const order = new VoxelOrder({ centres, lattice: nesting });
    order.seenFrom(inVoxelFrame(eye, frame));
    const placeOf = new Uint32Array(shown.length);
    order.boxes.forEach((box, place) => {
      placeOf[box] = place;
    });
    const distance = (box: number) =>
      Math.hypot(
        positions[shown[box] * 3] - eye[0],
        positions[shown[box] * 3 + 1] - eye[1],
        positions[shown[box] * 3 + 2] - eye[2]
      );
    for (let row = 0; row + 1 < nesting.rows.length; row++) {
      for (let box = nesting.rows[row]; box + 1 < nesting.rows[row + 1]; box++) {
        expect(placeOf[box + 1] > placeOf[box]).toBe(distance(box + 1) < distance(box));
      }
    }
  });
});

describe('placeVoxels', () => {
  const positions = offsetPlanes();
  const grid = contactGrid(positions);
  if (!grid) throw new Error('no grid');

  it('nests the boxes in planes of rows, along the stack first', () => {
    const { lattice, centres } = placeVoxels(grid, null);
    expect(lattice.axes).toEqual([1, 0, 2]);
    expect(lattice.planes.length).toBe(grid.slices[1] + 1);
    expect(lattice.rows.at(-1)).toBe(centres.length / 3);
    for (let plane = 0; plane + 1 < lattice.planes.length; plane++) {
      const [first, end] = [
        lattice.rows[lattice.planes[plane]],
        lattice.rows[lattice.planes[plane + 1]],
      ];
      for (let box = first; box < end; box++) {
        expect(centres[box * 3 + 1]).toBeCloseTo(centres[first * 3 + 1], 3);
      }
    }
  });

  it('keeps each contact with its colour, whatever the contacts come in', () => {
    const contacts = positions.length / 3;
    const shuffled = new Float32Array(positions.length);
    for (let contact = 0; contact < contacts; contact++) {
      const from = contacts - 1 - contact;
      shuffled.set(positions.subarray(from * 3, from * 3 + 3), contact * 3);
    }
    const reversedGrid = contactGrid(shuffled);
    if (!reversedGrid) throw new Error('no grid');
    const placement = placeVoxels(reversedGrid, null);
    const levels = new Uint8Array(contacts);
    levels[contacts - 1] = SCENE_LEVELS - 1;
    const { centres, looks } = voxelsOf(placement, levels);
    const loudest = placement.shown.indexOf(contacts - 1);
    expect(loudest).toBe(0);
    expect(Array.from(centres.subarray(0, 3))).toEqual(Array.from(positions.subarray(0, 3)));
    expect(looks[3]).toBeCloseTo(0.55, 5);
    expect(looks[7]).toBeCloseTo(0.55, 5);
    expect(Array.from(looks.subarray(0, 3))).not.toEqual(Array.from(looks.subarray(4, 7)));
  });

  it.each([0, 1, 2])('orders every box of a slice along axis %d once', (axis) => {
    for (let index = 0; index < grid.slices[axis]; index++) {
      const placement = placeVoxels(grid, { axis, index });
      const order = new VoxelOrder(placement);
      order.seenFrom([200, 900, -300]);
      expect(new Set(order.boxes).size).toBe(placement.shown.length);
    }
  });
});

describe('voxelsOf', () => {
  const positions = offsetPlanes();
  const grid = contactGrid(positions);
  if (!grid) throw new Error('no grid');
  const contacts = positions.length / 3;

  it('draws them among the cells', () => {
    const levels = new Uint8Array(contacts);
    expect(voxelsOf(placeVoxels(grid, null), levels).among).toBe(true);
  });

  it('draws every contact where it is, more opaque the larger |V|', () => {
    const levels = new Uint8Array(contacts).fill(levelOf(0));
    levels[0] = SCENE_LEVELS - 1;
    levels[1] = 0;
    levels[2] = levelOf(0.5);
    const { centres, sizes, looks } = voxelsOf(placeVoxels(grid, null), levels);
    expect(Array.from(centres)).toEqual(Array.from(positions));
    expect(sizes[0]).toBeCloseTo(grid.pitch[0] * 0.85, 3);
    expect(looks[3]).toBeCloseTo(0.55, 5);
    expect(looks[7]).toBeCloseTo(0.55, 5);
    expect(looks[11]).toBeGreaterThan(0.05);
    expect(looks[11]).toBeLessThan(0.3);
    expect(looks[15]).toBe(0);
  });

  it('keeps where the boxes are when only the colours change', () => {
    const placement = placeVoxels(grid, null);
    const quiet = voxelsOf(placement, new Uint8Array(contacts).fill(levelOf(0)));
    const loud = voxelsOf(placement, new Uint8Array(contacts).fill(SCENE_LEVELS - 1));
    expect(loud.centres).toBe(quiet.centres);
    expect(loud.sizes).toBe(quiet.sizes);
    expect(loud.looks).not.toEqual(quiet.looks);
  });

  it('draws a slice as opaque tiles on its plane, the quiet ones too', () => {
    const levels = new Uint8Array(contacts).fill(levelOf(0));
    for (const axis of [0, 1, 2]) {
      let total = 0;
      for (let index = 0; index < grid.slices[axis]; index++) {
        const slice = { axis, index };
        const { centres, sizes, looks } = voxelsOf(placeVoxels(grid, slice), levels);
        total += centres.length / 3;
        for (let i = axis; i < centres.length; i += 3) {
          expect(centres[i]).toBeCloseTo(slicePosition(grid, slice), 3);
          expect(sizes[i]).toBeCloseTo(grid.pitch[axis] * 0.12, 3);
        }
        expect(looks.filter((_, i) => i % 4 === 3).every((a) => a > 0.94)).toBe(true);
      }
      expect(total).toBe(contacts);
    }
  });
});
