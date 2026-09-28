/**
 * SWC parsing and section extraction.
 *
 * An SWC file is a tree of sample points (x, y, z, radius, type, parent).
 * For meshing we regroup the tree into *sections*: maximal unbranched chains
 * of points of a single type. Each neurite section starts at its parent point
 * (a branch point or a soma point) so consecutive sections are connected.
 */

import { type SomaStems, somaFromStems } from './soma';

export const SWC_UNDEFINED = 0;
export const SWC_SOMA = 1;
export const SWC_AXON = 2;
export const SWC_BASAL = 3;
export const SWC_APICAL = 4;

const TYPE_NAMES: Record<number, string> = {
  0: 'undefined',
  1: 'soma',
  2: 'axon',
  3: 'basal dendrite',
  4: 'apical dendrite',
  5: 'custom',
  6: 'unspecified neurite',
  7: 'glia process',
};

export function typeName(t: number): string {
  return TYPE_NAMES[t] ?? `type ${t}`;
}

export interface Section {
  /** SWC type of the points in this section. */
  type: number;
  /** Packed x, y, z, r for every point along the section. */
  points: Float64Array;
  /**
   * Node index (into the Morphology arrays) for each point; -1 for a point the preparation put in (untangling,
   * resampling). Only the two ends are always nodes of the morphology.
   */
  nodes: Int32Array;
}

export type SomaModel = 'none' | 'point' | 'three-point' | 'fit';

export interface Soma {
  model: SomaModel;
  center: [number, number, number];
  radius: number;
  /** Number of SWC points that carried the soma type. */
  pointCount: number;
}

export interface Morphology {
  nodeCount: number;
  types: Uint8Array;
  /** Packed x, y, z per node. */
  xyz: Float64Array;
  radius: Float64Array;
  /** Parent node index, -1 for roots. */
  parent: Int32Array;
  sections: Section[];
  /** The soma as one sphere from the SWC soma points: its centre, and the radius the stems fall back to. */
  soma: Soma;
  /** The soma sized from the first sample of each arbor (soma.ts): what the mesher builds the soma from. */
  somaStems: SomaStems;
  /** Bounding box of all points, expanded by their radius. */
  bbox: { min: [number, number, number]; max: [number, number, number] };
  /** Total cable length per type (µm). */
  cableLength: Map<number, number>;
}

export function parseSwc(text: string): Morphology {
  const lines = text.split(/\r?\n/);
  const idList: number[] = [];
  const typeList: number[] = [];
  const xyzList: number[] = [];
  const rList: number[] = [];
  const parentIdList: number[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const f = line.split(/\s+/);
    if (f.length < 7) throw new Error(`SWC line ${li + 1}: expected 7 columns, got ${f.length}`);
    const id = Number(f[0]);
    const type = Number(f[1]);
    const x = Number(f[2]);
    const y = Number(f[3]);
    const z = Number(f[4]);
    const r = Number(f[5]);
    const parent = Number(f[6]);
    if (![id, type, x, y, z, r, parent].every(Number.isFinite)) {
      throw new Error(`SWC line ${li + 1}: non-numeric value`);
    }
    idList.push(id);
    typeList.push(type);
    xyzList.push(x, y, z);
    rList.push(r);
    parentIdList.push(parent);
  }

  const n = idList.length;
  if (n === 0) throw new Error('SWC file contains no sample points');

  const ids = Int32Array.from(idList);
  const types = Uint8Array.from(typeList.map((t) => (t >= 0 && t < 256 ? t : SWC_UNDEFINED)));
  const xyz = Float64Array.from(xyzList);
  const radius = Float64Array.from(rList);

  const indexById = new Map<number, number>();
  for (let i = 0; i < n; i++) indexById.set(ids[i], i);

  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const p = parentIdList[i];
    const pi = p < 0 ? -1 : (indexById.get(p) ?? -1);
    parent[i] = pi === i ? -1 : pi;
  }

  // Children in CSR form so we can follow single-child chains cheaply.
  const childCount = new Int32Array(n);
  for (let i = 0; i < n; i++) if (parent[i] >= 0) childCount[parent[i]]++;
  const childStart = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) childStart[i + 1] = childStart[i] + childCount[i];
  const childList = new Int32Array(n);
  const fill = childStart.slice(0, n);
  for (let i = 0; i < n; i++) {
    const p = parent[i];
    if (p >= 0) childList[fill[p]++] = i;
  }

  const soma = buildSoma(types, xyz, radius, parent, childCount);

  const sections: Section[] = [];
  const visited = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (types[i] === SWC_SOMA || visited[i]) continue;
    const p = parent[i];
    const startsSection =
      p < 0 || types[p] === SWC_SOMA || childCount[p] !== 1 || types[p] !== types[i];
    if (!startsSection) continue;

    const nodes: number[] = [];
    const pts: number[] = [];
    if (p >= 0) {
      // Start at the parent so sections connect. A soma parent contributes its
      // position but the child's radius, otherwise the section would begin as
      // a soma-sized blob.
      const pr = types[p] === SWC_SOMA ? radius[i] : radius[p];
      nodes.push(p);
      pts.push(xyz[3 * p], xyz[3 * p + 1], xyz[3 * p + 2], pr);
    }
    let cur = i;
    for (;;) {
      visited[cur] = 1;
      nodes.push(cur);
      pts.push(xyz[3 * cur], xyz[3 * cur + 1], xyz[3 * cur + 2], radius[cur]);
      if (childCount[cur] !== 1) break;
      const c = childList[childStart[cur]];
      if (types[c] !== types[cur]) break;
      cur = c;
    }
    if (nodes.length >= 2) {
      sections.push({
        type: types[i],
        points: Float64Array.from(pts),
        nodes: Int32Array.from(nodes),
      });
    } else if (nodes.length === 1) {
      // Isolated single point without a parent: represent it as a sphere.
      sections.push({
        type: types[i],
        points: Float64Array.from([...pts, ...pts]),
        nodes: Int32Array.from([nodes[0], nodes[0]]),
      });
    }
  }

  const bbox = {
    min: [Infinity, Infinity, Infinity] as [number, number, number],
    max: [-Infinity, -Infinity, -Infinity] as [number, number, number],
  };
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      const v = xyz[3 * i + a];
      const r = radius[i];
      if (v - r < bbox.min[a]) bbox.min[a] = v - r;
      if (v + r > bbox.max[a]) bbox.max[a] = v + r;
    }
  }

  const cableLength = new Map<number, number>();
  for (const s of sections) {
    let len = 0;
    const p = s.points;
    for (let k = 4; k < p.length; k += 4) {
      const dx = p[k] - p[k - 4];
      const dy = p[k + 1] - p[k - 3];
      const dz = p[k + 2] - p[k - 2];
      len += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    cableLength.set(s.type, (cableLength.get(s.type) ?? 0) + len);
  }

  const somaStems = somaFromStems({ nodeCount: n, types, parent, sections, soma });
  return { nodeCount: n, types, xyz, radius, parent, sections, soma, somaStems, bbox, cableLength };
}

function buildSoma(
  types: Uint8Array,
  xyz: Float64Array,
  radius: Float64Array,
  parent: Int32Array,
  childCount: Int32Array
): Soma {
  const somaNodes: number[] = [];
  for (let i = 0; i < types.length; i++) if (types[i] === SWC_SOMA) somaNodes.push(i);
  const pointCount = somaNodes.length;

  if (pointCount === 0) {
    return { model: 'none', center: [0, 0, 0], radius: 0, pointCount };
  }
  if (pointCount === 1) {
    const i = somaNodes[0];
    return {
      model: 'point',
      center: [xyz[3 * i], xyz[3 * i + 1], xyz[3 * i + 2]],
      radius: radius[i],
      pointCount,
    };
  }
  if (pointCount === 3) {
    // Three-point soma (NeuroMorpho convention): a centre with two children at
    // ±r along one axis, all sharing the same radius.
    const centre = somaNodes.find((i) => parent[i] < 0 || types[parent[i]] !== SWC_SOMA);
    if (centre !== undefined) {
      const others = somaNodes.filter((i) => i !== centre);
      const r = radius[centre];
      const ok = others.every((i) => {
        if (parent[i] !== centre || childCount[i] !== 0) return false;
        if (Math.abs(radius[i] - r) > 1e-3 * Math.max(1, r)) return false;
        const d = Math.hypot(
          xyz[3 * i] - xyz[3 * centre],
          xyz[3 * i + 1] - xyz[3 * centre + 1],
          xyz[3 * i + 2] - xyz[3 * centre + 2]
        );
        return Math.abs(d - r) < 0.05 * Math.max(1, r);
      });
      if (ok) {
        return {
          model: 'three-point',
          center: [xyz[3 * centre], xyz[3 * centre + 1], xyz[3 * centre + 2]],
          radius: r,
          pointCount,
        };
      }
    }
  }
  // Generic multi-point soma (contour or stack of cylinders): fit a sphere to
  // the centroid; radius is the larger of the mean point radius and the mean
  // distance of points from the centroid.
  const c: [number, number, number] = [0, 0, 0];
  let meanR = 0;
  for (const i of somaNodes) {
    c[0] += xyz[3 * i];
    c[1] += xyz[3 * i + 1];
    c[2] += xyz[3 * i + 2];
    meanR += radius[i];
  }
  c[0] /= pointCount;
  c[1] /= pointCount;
  c[2] /= pointCount;
  meanR /= pointCount;
  let meanD = 0;
  for (const i of somaNodes)
    meanD += Math.hypot(xyz[3 * i] - c[0], xyz[3 * i + 1] - c[1], xyz[3 * i + 2] - c[2]);
  meanD /= pointCount;
  return { model: 'fit', center: c, radius: Math.max(meanR, meanD), pointCount };
}
