/**
 * A mesh on a 16-bit grid made coarse by vertex clustering: the grid cut into cubes of 2^shift steps, every vertex in
 * a cube moved to their mean, and the triangles left with three corners in three cubes kept, once each. It is what
 * meshoptimizer's sloppy simplifier does, on a grid as fine as asked: the simplifier's has at most 1,024 cells across
 * the mesh, a micron and more on the largest cells.
 */

/** A table of cubes, by their grid position: open addressing, grown as it fills. */
class Cubes {
  private keys: Float64Array;
  private ids: Int32Array;
  private mask: number;
  count = 0;

  constructor(expected: number) {
    let size = 1024;
    while (size < 2 * expected) size *= 2;
    this.keys = new Float64Array(size).fill(-1);
    this.ids = new Int32Array(size);
    this.mask = size - 1;
  }

  /** The cube's index, numbered as cubes are first met. */
  id(x: number, y: number, z: number): number {
    const key = (x * 65536 + y) * 65536 + z;
    let i = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & this.mask;
    for (;;) {
      const k = this.keys[i];
      if (k === key) return this.ids[i];
      if (k === -1) break;
      i = (i + 1) & this.mask;
    }
    this.keys[i] = key;
    this.ids[i] = this.count;
    if (++this.count * 2 > this.keys.length) this.grow();
    return this.count - 1;
  }

  private grow(): void {
    const { keys, ids } = this;
    this.keys = new Float64Array(keys.length * 2).fill(-1);
    this.ids = new Int32Array(keys.length * 2);
    this.mask = this.keys.length - 1;
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      if (key === -1) continue;
      const z = key % 65536,
        y = ((key - z) / 65536) % 65536,
        x = (key - z - 65536 * y) / 65536 / 65536;
      let i =
        (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & this.mask;
      while (this.keys[i] !== -1) i = (i + 1) & this.mask;
      this.keys[i] = key;
      this.ids[i] = ids[j];
    }
  }
}

/** Triangles of cube indices, each kept once whichever corner it starts at. */
class Triangles {
  private keys: Int32Array;
  private mask: number;
  out: Uint32Array;
  count = 0;

  constructor(expected: number) {
    let size = 1024;
    while (size < 2 * expected) size *= 2;
    this.keys = new Int32Array(3 * size).fill(-1);
    this.mask = size - 1;
    this.out = new Uint32Array(3 * Math.max(16, expected));
  }

  add(p: number, q: number, r: number): void {
    // From the smallest corner, keeping the winding.
    let a = p,
      b = q,
      c = r;
    if (q < p && q < r) {
      a = q;
      b = r;
      c = p;
    } else if (r < p && r < q) {
      a = r;
      b = p;
      c = q;
    }
    let i = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & this.mask;
    for (;;) {
      const k = 3 * i;
      if (this.keys[k] === -1) break;
      if (this.keys[k] === a && this.keys[k + 1] === b && this.keys[k + 2] === c) return;
      i = (i + 1) & this.mask;
    }
    this.keys[3 * i] = a;
    this.keys[3 * i + 1] = b;
    this.keys[3 * i + 2] = c;
    if (3 * this.count + 3 > this.out.length) {
      const out = new Uint32Array(this.out.length * 2);
      out.set(this.out);
      this.out = out;
    }
    this.out[3 * this.count] = a;
    this.out[3 * this.count + 1] = b;
    this.out[3 * this.count + 2] = c;
    if (++this.count * 2 > this.keys.length / 3) this.grow();
  }

  private grow(): void {
    const keys = this.keys;
    this.keys = new Int32Array(keys.length * 2).fill(-1);
    this.mask = this.keys.length / 3 - 1;
    for (let j = 0; j < keys.length; j += 3) {
      const a = keys[j];
      if (a === -1) continue;
      const b = keys[j + 1],
        c = keys[j + 2];
      let i =
        (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & this.mask;
      while (this.keys[3 * i] !== -1) i = (i + 1) & this.mask;
      this.keys[3 * i] = a;
      this.keys[3 * i + 1] = b;
      this.keys[3 * i + 2] = c;
    }
  }
}

export interface Clustered {
  /** x, y, z per cube: the mean of its vertices, rounded to the grid. */
  positions: Uint16Array;
  indices: Uint32Array;
  /** The farthest a vertex moved, in grid steps. */
  moved: number;
}

export function clusterOnGrid(
  positions: Uint16Array,
  indices: Uint32Array,
  shift: number
): Clustered {
  const n = positions.length / 3;
  const cubes = new Cubes(n >> (2 * shift));
  const cubeOf = new Uint32Array(n);
  let sums = new Float64Array(3 * 1024);
  let counts = new Uint32Array(1024);
  for (let v = 0; v < n; v++) {
    const x = positions[3 * v],
      y = positions[3 * v + 1],
      z = positions[3 * v + 2];
    const c = cubes.id(x >> shift, y >> shift, z >> shift);
    cubeOf[v] = c;
    if (c >= counts.length) {
      const more = new Float64Array(sums.length * 2);
      more.set(sums);
      sums = more;
      const moreCounts = new Uint32Array(counts.length * 2);
      moreCounts.set(counts);
      counts = moreCounts;
    }
    sums[3 * c] += x;
    sums[3 * c + 1] += y;
    sums[3 * c + 2] += z;
    counts[c]++;
  }
  const out = new Uint16Array(3 * cubes.count);
  for (let c = 0; c < cubes.count; c++) {
    for (let k = 0; k < 3; k++) out[3 * c + k] = Math.round(sums[3 * c + k] / counts[c]);
  }
  let moved = 0;
  for (let v = 0; v < n; v++) {
    const c = 3 * cubeOf[v];
    const dx = positions[3 * v] - out[c],
      dy = positions[3 * v + 1] - out[c + 1],
      dz = positions[3 * v + 2] - out[c + 2];
    const d = dx * dx + dy * dy + dz * dz;
    if (d > moved) moved = d;
  }

  const triangles = new Triangles((indices.length / 3) >> (2 * shift));
  for (let t = 0; t < indices.length; t += 3) {
    const a = cubeOf[indices[t]],
      b = cubeOf[indices[t + 1]],
      c = cubeOf[indices[t + 2]];
    if (a !== b && b !== c && a !== c) triangles.add(a, b, c);
  }
  return {
    positions: out,
    indices: triangles.out.slice(0, 3 * triangles.count),
    moved: Math.sqrt(moved),
  };
}
