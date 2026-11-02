/**
 * The skeleton figure's geometry: the skeleton as swept tubes, the membrane, the soma and the spines
 * from their meshes, and the chosen spine's own skeleton. The meshes come as the files have them;
 * the spines' are cleaned first, as theirs are triangle soups (`cleanTriangles`, `orientByHints`).
 */

import * as THREE from 'three';

import type { Morphology } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import type { SpineArrays } from './data';

type V = [number, number, number];

/** The thinnest a skeleton tube is drawn, µm: a radius of 0 would leave a fibre out. */
export const TUBE_FLOOR = 0.15;

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const scaled = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
function unit(a: V): V {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? scaled(a, 1 / l) : [0, 0, 0];
}
const at = (p: ArrayLike<number>, i: number, stride = 3): V => [
  p[stride * i],
  p[stride * i + 1],
  p[stride * i + 2],
];

/** A mesh as it is built: positions and normals, a tag per vertex, and triangles. */
class Builder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly tags: number[] = [];
  readonly indices: number[] = [];

  get count(): number {
    return this.tags.length;
  }

  vertex(p: V, n: V, tag: number): number {
    this.positions.push(p[0], p[1], p[2]);
    this.normals.push(n[0], n[1], n[2]);
    this.tags.push(tag);
    return this.tags.length - 1;
  }

  geometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(this.positions), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(this.normals), 3));
    geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(this.indices), 1));
    geo.computeBoundingSphere();
    return geo;
  }
}

let unitSphere: { positions: Float32Array; indices: ArrayLike<number> } | null = null;

/** A sphere of radius `r` round `c`: a low one, to close a tube's joint or end. */
function sphere(b: Builder, c: V, r: number, tag: number): void {
  if (!unitSphere) {
    const g = new THREE.SphereGeometry(1, 12, 8);
    unitSphere = {
      positions: g.getAttribute('position').array as Float32Array,
      indices: (g.getIndex() as THREE.BufferAttribute).array,
    };
  }
  const { positions, indices } = unitSphere;
  const base = b.count;
  for (let i = 0; i < positions.length / 3; i++) {
    const n = at(positions, i);
    b.vertex([c[0] + r * n[0], c[1] + r * n[1], c[2] + r * n[2]], n, tag);
  }
  for (let i = 0; i < indices.length; i++) b.indices.push(base + indices[i]);
}

/**
 * A tube along `points`, of `radii`, with `sides` sides, its rings kept from twisting by a
 * rotation-minimising frame (double reflection: Wang, Jüttler, Zheng and Liu 2008). Its triangles
 * face out. Open at both ends.
 */
function tube(b: Builder, points: V[], radii: number[], sides: number, tag: number): void {
  const n = points.length;
  if (n < 2) return;
  const tangents = points.map((_, i) =>
    unit(sub(points[Math.min(i + 1, n - 1)], points[Math.max(i - 1, 0)]))
  );
  // Any normal to the first tangent, away from the axis it is nearest.
  const t0 = tangents[0];
  const away: V = Math.abs(t0[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let r = unit(cross(cross(t0, away), t0));
  const frames: V[] = [r];
  for (let i = 0; i < n - 1; i++) {
    const v1 = sub(points[i + 1], points[i]);
    const c1 = dot(v1, v1);
    if (c1 < 1e-12) {
      frames.push(r);
      continue;
    }
    const rL = sub(r, scaled(v1, (2 / c1) * dot(v1, r)));
    const tL = sub(tangents[i], scaled(v1, (2 / c1) * dot(v1, tangents[i])));
    const v2 = sub(tangents[i + 1], tL);
    const c2 = dot(v2, v2);
    r = unit(c2 < 1e-12 ? rL : sub(rL, scaled(v2, (2 / c2) * dot(v2, rL))));
    frames.push(r);
  }
  const base = b.count;
  for (let i = 0; i < n; i++) {
    const s = cross(tangents[i], frames[i]);
    for (let k = 0; k < sides; k++) {
      const a = (2 * Math.PI * k) / sides;
      const d: V = [
        Math.cos(a) * frames[i][0] + Math.sin(a) * s[0],
        Math.cos(a) * frames[i][1] + Math.sin(a) * s[1],
        Math.cos(a) * frames[i][2] + Math.sin(a) * s[2],
      ];
      const p = points[i];
      b.vertex([p[0] + radii[i] * d[0], p[1] + radii[i] * d[1], p[2] + radii[i] * d[2]], d, tag);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k,
        c = a + sides;
      const b1 = base + i * sides + ((k + 1) % sides),
        d = b1 + sides;
      b.indices.push(a, b1, c, b1, d, c);
    }
  }
}

/** How many sides a tube of radius `r` gets: 8 for a thin fibre, up to 14 for a thick one. */
export function sidesFor(r: number): number {
  return Math.min(14, Math.max(8, Math.round(8 + 5 * r)));
}

/** The skeleton as tubes, and per vertex the parseSwc section it is of and that section's type. */
export interface Tubes {
  geometry: THREE.BufferGeometry;
  sections: Uint16Array;
  types: Uint8Array;
}

/**
 * Every section of `morphology` as a tube of its points' radii (at least `floor`), with a sphere at
 * each end to close the joints: one sphere to a place, where sections meet.
 */
export function skeletonTubes(morphology: Morphology, floor = TUBE_FLOOR): Tubes {
  const b = new Builder();
  const joints = new Set<string>();
  morphology.sections.forEach((section, s) => {
    const points: V[] = [];
    const radii: number[] = [];
    const p = section.points;
    for (let k = 0; k + 3 < p.length; k += 4) {
      const q: V = [p[k], p[k + 1], p[k + 2]];
      const last = points.at(-1);
      if (last && dot(sub(q, last), sub(q, last)) < 1e-12) continue;
      points.push(q);
      radii.push(Math.max(floor, p[k + 3]));
    }
    if (points.length === 0) return;
    tube(b, points, radii, sidesFor(Math.max(...radii)), s);
    for (const end of [0, points.length - 1]) {
      const key = points[end].map((v) => v.toFixed(4)).join(',');
      if (joints.has(key)) continue;
      joints.add(key);
      sphere(b, points[end], radii[end], s);
    }
  });
  const sections = Uint16Array.from(b.tags);
  const types = Uint8Array.from(sections, (s) => morphology.sections[s].type);
  return { geometry: b.geometry(), sections, types };
}

/**
 * The triangles from `from` to `to` (in triangles) of `indices`, without those that repeat a vertex
 * and with one of each set of triangles on the same three vertices: what is left of a soup once its
 * vertices are merged, as morph-spines merges them.
 */
export function cleanTriangles(indices: ArrayLike<number>, from: number, to: number): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (let t = from; t < to; t++) {
    const a = indices[3 * t],
      b = indices[3 * t + 1],
      c = indices[3 * t + 2];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a, b, c);
  }
  return out;
}

/**
 * Wind each of `triangles` (in place) so that its normal points the way `hintOf` gives for its
 * centroid, the way out of the surface; it counts the triangles turned round. For a mesh whose
 * winding cannot be trusted: one way out for every triangle, so the normals agree.
 */
export function orientByHints(
  triangles: number[],
  positions: ArrayLike<number>,
  hintOf: (centroid: V) => V
): number {
  let turned = 0;
  for (let t = 0; t + 2 < triangles.length; t += 3) {
    const a = at(positions, triangles[t]),
      b = at(positions, triangles[t + 1]),
      c = at(positions, triangles[t + 2]);
    const normal = cross(sub(b, a), sub(c, a));
    const centroid: V = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    if (dot(normal, hintOf(centroid)) < 0) {
      [triangles[t + 1], triangles[t + 2]] = [triangles[t + 2], triangles[t + 1]];
      turned++;
    }
  }
  return turned;
}

/** Smooth vertex normals: each vertex's triangles' normals, weighted by their area. */
export function vertexNormals(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>
): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let t = 0; t + 2 < triangles.length; t += 3) {
    const ia = triangles[t],
      ib = triangles[t + 1],
      ic = triangles[t + 2];
    const a = at(positions, ia);
    const n = cross(sub(at(positions, ib), a), sub(at(positions, ic), a));
    for (const i of [ia, ib, ic]) {
      normals[3 * i] += n[0];
      normals[3 * i + 1] += n[1];
      normals[3 * i + 2] += n[2];
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l;
    normals[i + 1] /= l;
    normals[i + 2] /= l;
  }
  return normals;
}

/** A closed mesh's triangles wound to face out: as they are, or all turned round if they face in. */
export function outward(positions: ArrayLike<number>, indices: ArrayLike<number>): Uint32Array {
  const n = positions.length / 3;
  const c: V = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) c[k] += positions[3 * i + k] / n;
  let volume = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = sub(at(positions, indices[t]), c),
      b = sub(at(positions, indices[t + 1]), c),
      d = sub(at(positions, indices[t + 2]), c);
    volume += dot(a, cross(b, d));
  }
  const out = Uint32Array.from(indices);
  if (volume < 0) {
    for (let t = 0; t + 2 < out.length; t += 3) [out[t + 1], out[t + 2]] = [out[t + 2], out[t + 1]];
  }
  return out;
}

/** A mesh of its own positions and triangles, wound to face out, with smooth normals. */
export function closedMesh(
  positions: Float32Array,
  indices: ArrayLike<number>
): THREE.BufferGeometry {
  const triangles = outward(positions, indices);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(vertexNormals(positions, triangles), 3));
  geo.setIndex(new THREE.BufferAttribute(triangles, 1));
  geo.computeBoundingSphere();
  return geo;
}

/** The spines: the chosen one apart from the rest, sharing their vertices, normals and colours. */
export interface SpineMeshes {
  rest: THREE.BufferGeometry;
  chosen: THREE.BufferGeometry;
  colour: THREE.BufferAttribute;
}

/**
 * The spines' meshes, cleaned and wound one way out. Out is away from the nearest point of the
 * spine's own skeleton where that has a few points inside the spine; otherwise away from the
 * spine's own axis, its local +y, in its own frame (`spineLocalPositions`), short of its ends.
 */
export function spineMeshes(
  s: SpineArrays,
  chosen: number,
  skeletonUnfit: ReadonlySet<number>
): SpineMeshes {
  const n = s.spineVertexStart.length - 1;
  const rest: number[] = [];
  const own: number[] = [];
  for (let i = 0; i < n; i++) {
    const triangles = cleanTriangles(
      s.spineIndices,
      s.spineTriangleStart[i],
      s.spineTriangleStart[i + 1]
    );
    const p0 = s.spineSkeletonPointStart[i],
      p1 = s.spineSkeletonPointStart[i + 1];
    if (p1 - p0 >= 4 && !skeletonUnfit.has(i)) {
      const points: V[] = [];
      for (let k = p0; k < p1; k++) points.push(at(s.spineSkeletonPoints, k, 4));
      orientByHints(triangles, s.spinePositions, (c) => {
        let best = points[0],
          bestD = Infinity;
        for (const q of points) {
          const d = sub(c, q);
          const dd = dot(d, d);
          if (dd < bestD) {
            bestD = dd;
            best = q;
          }
        }
        return sub(c, best);
      });
    } else {
      let lo = Infinity,
        hi = -Infinity;
      for (let v = s.spineVertexStart[i]; v < s.spineVertexStart[i + 1]; v++) {
        lo = Math.min(lo, s.spineLocalPositions[3 * v + 1]);
        hi = Math.max(hi, s.spineLocalPositions[3 * v + 1]);
      }
      const inset = Math.min(0.25, 0.25 * (hi - lo));
      orientByHints(triangles, s.spineLocalPositions, (c) => [
        c[0],
        c[1] - Math.min(hi - inset, Math.max(lo + inset, c[1])),
        c[2],
      ]);
    }
    const target = i === chosen ? own : rest;
    for (const v of triangles) target.push(v);
  }
  const normals = vertexNormals(s.spinePositions, [...rest, ...own]);
  const position = new THREE.BufferAttribute(s.spinePositions, 3);
  const normal = new THREE.BufferAttribute(normals, 3);
  const colour = new THREE.BufferAttribute(new Float32Array(s.spinePositions.length), 3);
  const make = (triangles: number[]) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', position);
    geo.setAttribute('normal', normal);
    geo.setAttribute('color', colour);
    geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(triangles), 1));
    geo.computeBoundingSphere();
    return geo;
  };
  return { rest: make(rest), chosen: make(own), colour };
}

/** A spine's own skeleton, as thin tubes of `radius` between its points, with a bead at each. */
export function spineSkeletonTubes(
  s: SpineArrays,
  spine: number,
  radius: number
): THREE.BufferGeometry {
  const b = new Builder();
  const p0 = s.spineSkeletonPointStart[spine],
    p1 = s.spineSkeletonPointStart[spine + 1];
  const points = s.spineSkeletonPoints;
  const segments = s.spineSkeletonSegments;
  for (let k = 0; k + 1 < segments.length; k += 2) {
    const a = segments[k],
      c = segments[k + 1];
    if (a < p0 || a >= p1 || c < p0 || c >= p1) continue;
    tube(b, [at(points, a, 4), at(points, c, 4)], [radius, radius], 6, 0);
  }
  for (let k = p0; k < p1; k++) sphere(b, at(points, k, 4), radius * 1.15, 0);
  return b.geometry();
}

/**
 * Spine `spine`'s mesh in its own frame, as stored (`spineLocalPositions`, a copy), on the triangles
 * `placedTriangles` that the placed spine is drawn with (indices into all spines' vertices, as
 * `spineMeshes` cleaned and wound them): the same faces, before the table's turn and move.
 */
export function localSpineMesh(
  s: SpineArrays,
  spine: number,
  placedTriangles: ArrayLike<number>
): THREE.BufferGeometry {
  const v0 = s.spineVertexStart[spine],
    v1 = s.spineVertexStart[spine + 1];
  const positions = s.spineLocalPositions.slice(3 * v0, 3 * v1);
  const triangles = Uint32Array.from(placedTriangles, (v) => v - v0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(vertexNormals(positions, triangles), 3));
  geo.setIndex(new THREE.BufferAttribute(triangles, 1));
  geo.computeBoundingSphere();
  return geo;
}

/** Every spine's own skeleton, placed on the cell: its points' x, y, z, and its segments' pairs of them. */
export function spineSkeletonLines(s: SpineArrays): THREE.BufferGeometry {
  const n = s.spineSkeletonPoints.length / 4;
  const positions = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) {
    positions[3 * k] = s.spineSkeletonPoints[4 * k];
    positions[3 * k + 1] = s.spineSkeletonPoints[4 * k + 1];
    positions[3 * k + 2] = s.spineSkeletonPoints[4 * k + 2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(s.spineSkeletonSegments), 1));
  geo.computeBoundingSphere();
  return geo;
}

/** Each parseSwc section's middle, half way along its path: where its label goes. */
export function sectionMiddles(morphology: Morphology): V[] {
  return morphology.sections.map((section) => {
    const p = section.points;
    const points: V[] = [];
    for (let k = 0; k + 3 < p.length; k += 4) points.push([p[k], p[k + 1], p[k + 2]]);
    if (points.length === 0) return [0, 0, 0];
    let total = 0;
    for (let i = 1; i < points.length; i++) total += Math.hypot(...sub(points[i], points[i - 1]));
    let walked = 0;
    for (let i = 1; i < points.length; i++) {
      const step = Math.hypot(...sub(points[i], points[i - 1]));
      if (walked + step >= total / 2 && step > 0) {
        const f = (total / 2 - walked) / step;
        const a = points[i - 1],
          b = points[i];
        return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
      }
      walked += step;
    }
    return points[0];
  });
}
