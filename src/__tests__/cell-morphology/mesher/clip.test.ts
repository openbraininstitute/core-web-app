// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import {
  type ClipPlane,
  clipMesh,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/clip';
import {
  buildMesh,
  simplifierReady,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { parseSwc } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import { SectionPath } from '@/features/entities/cell-morphology/morpho-viewer/engine/tubes';

import { checkMesh, params } from './mesh-utils';

beforeAll(() => simplifierReady);

/** A capsule along a skew direction, cut across at arc length s. */
function cutCapsule(r: number, simplifyMesh: number, s: number) {
  const L = 12;
  const d = [0.64, 0.48, 0.6];
  const end = d.map((x) => x * L);
  const m = parseSwc(`1 3 1 2 3 ${r} -1\n2 3 ${1 + end[0]} ${2 + end[1]} ${3 + end[2]} ${r} 1`);
  const p = params({ simplifyMesh });
  const mesh = buildMesh(m, p);
  const path = new SectionPath(
    Float64Array.from([1, 2, 3, r, 1 + end[0], 2 + end[1], 3 + end[2], r])
  );
  const c = [1 + d[0] * s, 2 + d[1] * s, 3 + d[2] * s];
  const plane: ClipPlane = {
    cx: c[0],
    cy: c[1],
    cz: c[2],
    nx: d[0],
    ny: d[1],
    nz: d[2],
    reach: r + 1.5 * p.voxel,
    farLimit: L - s + 2 * r + 1,
    snap: 0.1 * p.voxel,
    minEdge: 0.15 * r,
    maxSagitta: 0.05,
  };
  const out = clipMesh(mesh, mesh.center, [plane], (_i, q) => {
    const dx = q[0] - c[0],
      dy = q[1] - c[1],
      dz = q[2] - c[2];
    const len = Math.hypot(dx, dy, dz);
    const rho = path.cast(c[0], c[1], c[2], dx / len, dy / len, dz / len, r, 0, 0);
    q[0] = c[0] + (rho * dx) / len;
    q[1] = c[1] + (rho * dy) / len;
    q[2] = c[2] + (rho * dz) / len;
    q[3] = path.gx;
    q[4] = path.gy;
    q[5] = path.gz;
  });
  return { out, mesh, c, d, r };
}

/**
 * A closed prism along x, eight vertices to a ring, with every vertex where `at` puts it: x, and angle (degrees) and
 * distance from the axis; its normal points straight away from the axis. Cut at x = 2, with the cut's vertices put on
 * the unit circle along rays from the axis, and loop edges shorter than `minEdge` collapsed. `dip` puts one more
 * vertex, where its `at` says, into the triangle of ring k, vertices i and i + 1, and ring k + 1.
 */
function cutPrism(
  rings: number,
  at: (k: number, i: number) => [number, number, number],
  dip?: { k: number; i: number; at: [number, number, number] },
  minEdge = 0.05
) {
  const N = 8;
  const positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  const put = ([x, deg, rho]: [number, number, number]): void => {
    const c = Math.cos((deg * Math.PI) / 180),
      s = Math.sin((deg * Math.PI) / 180);
    positions.push(x, rho * c, rho * s);
    normals.push(0, c, s);
  };
  for (let k = 0; k < rings; k++) for (let i = 0; i < N; i++) put(at(k, i));
  const start = rings * N,
    end = start + 1,
    extra = start + 2;
  positions.push(at(0, 0)[0], 0, 0, at(rings - 1, 0)[0], 0, 0);
  normals.push(-1, 0, 0, 1, 0, 0);
  if (dip) put(dip.at);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    for (let k = 0; k + 1 < rings; k++) {
      const a = k * N + i,
        b = k * N + j,
        c = (k + 1) * N + j,
        d = (k + 1) * N + i;
      if (dip?.k === k && dip.i === i) indices.push(a, b, extra, b, c, extra, c, a, extra);
      else indices.push(a, b, c);
      indices.push(a, c, d);
    }
    indices.push(start, j, i, end, (rings - 1) * N + i, (rings - 1) * N + j);
  }
  const whole = checkMesh(Float32Array.from(positions), Uint32Array.from(indices));
  expect(whole.closed && whole.manifold).toBe(true);
  const radii = new Float32Array(positions.length / 3).fill(2);
  const out = clipMesh(
    {
      positions: Float32Array.from(positions),
      normals: Float32Array.from(normals),
      vertexTypes: new Uint8Array(positions.length / 3),
      radii,
      indices: Uint32Array.from(indices),
    },
    [0, 0, 0],
    [
      {
        cx: 2,
        cy: 0,
        cz: 0,
        nx: 1,
        ny: 0,
        nz: 0,
        reach: 1.5,
        farLimit: 3,
        snap: 0.02,
        minEdge,
        maxSagitta: 1,
      },
    ],
    (_i, q) => {
      const len = Math.hypot(q[1], q[2]);
      q[0] = 2;
      q[1] /= len;
      q[2] /= len;
      q[3] = 0;
      q[4] = q[1];
      q[5] = q[2];
    }
  );
  // A vertex of the prism keeps its radius, and one the cut made takes its near end's.
  expect([...out.radii].every((x) => x === 2)).toBe(true);
  // The angle from each loop vertex to the next around the axis.
  const loop = out.loops[0];
  const steps: number[] = [];
  for (let i = 0; i < loop.length; i++) {
    const v = 3 * loop[i],
      w = 3 * loop[(i + 1) % loop.length];
    const py = out.positions[v + 1],
      pz = out.positions[v + 2],
      qy = out.positions[w + 1],
      qz = out.positions[w + 2];
    steps.push(Math.atan2(py * qz - pz * qy, py * qy + pz * qz));
  }
  return { out, loop, steps };
}

function expectOneTurn(cut: ReturnType<typeof cutPrism>): void {
  const { out, loop, steps } = cut;
  const check = checkMesh(out.positions, out.indices);
  expect(check.boundaryEdges).toBe(loop.length);
  expect(check.flippedEdges).toBe(0);
  expect(check.nonManifoldEdges).toBe(0);
  const turn = steps.reduce((a, b) => a + b, 0);
  expect(Math.abs(Math.abs(turn) - 2 * Math.PI)).toBeLessThan(1e-6);
  for (const step of steps) expect(step * turn).toBeGreaterThan(0);
}

describe('clipMesh', () => {
  for (const simplifyMesh of [0, 0.125]) {
    it(`cuts a capsule open along one loop in the plane (mesh simplify ${simplifyMesh})`, () => {
      const { out, mesh, c, d, r } = cutCapsule(0.8, simplifyMesh, 7.3);
      const check = checkMesh(out.positions, out.indices);
      expect(out.loops).toHaveLength(1);
      const loop = out.loops[0];
      expect(loop.length).toBeGreaterThanOrEqual(6);
      expect(check.boundaryEdges).toBe(loop.length);
      expect(check.flippedEdges).toBe(0);
      expect(check.nonManifoldEdges).toBe(0);
      expect(out.indices.length).toBeLessThan(mesh.indices.length);

      // Loop vertices: in the plane, on the tube, and in order around the axis.
      let turned = 0;
      for (let i = 0; i < loop.length; i++) {
        const v = 3 * loop[i],
          w = 3 * loop[(i + 1) % loop.length];
        const p = [0, 1, 2].map((k) => out.positions[v + k] + mesh.center[k] - c[k]);
        const q = [0, 1, 2].map((k) => out.positions[w + k] + mesh.center[k] - c[k]);
        expect(Math.abs(p[0] * d[0] + p[1] * d[1] + p[2] * d[2])).toBeLessThan(1e-4);
        expect(Math.hypot(...p)).toBeCloseTo(r, 3);
        expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])).toBeGreaterThanOrEqual(
          0.15 * r * 0.999
        );
        const cross = [
          p[1] * q[2] - p[2] * q[1],
          p[2] * q[0] - p[0] * q[2],
          p[0] * q[1] - p[1] * q[0],
        ];
        turned += Math.asin(
          Math.max(-1, Math.min(1, (cross[0] * d[0] + cross[1] * d[1] + cross[2] * d[2]) / (r * r)))
        );
      }
      // One full turn, all steps the same way.
      expect(Math.abs(Math.abs(turned) - 2 * Math.PI)).toBeLessThan(0.05);

      // Nothing is left beyond the plane.
      for (let v = 0; v < out.positions.length; v += 3) {
        const s = [0, 1, 2].reduce(
          (acc, k) => acc + (out.positions[v + k] + mesh.center[k] - c[k]) * d[k],
          0
        );
        expect(s).toBeLessThan(1e-4);
      }
    });
  }

  it('leaves no loop edge that runs backwards around the axis', () => {
    // A stub of a voxel in radius is cut in a rough polygon. This one has a notch that is not seen whole from the axis:
    // from the corner at 180° the outline goes back to 165° before it goes on to 240°.
    const cut = cutPrism(4, (k, i) => [
      [0, 1, 3, 4][k],
      i === 5 ? 165 : i === 6 ? 240 : i === 7 ? 300 : 60 * i,
      i === 5 ? 0.45 : 1,
    ]);
    expect(cut.loop.length).toBeGreaterThanOrEqual(6);
    expectOneTurn(cut);
  });

  it('cuts across a fold without a loop edge that runs backwards, whichever end of it is out of order', () => {
    // The simplifier leaves a few folds: a vertex with three neighbours just short of the plane, one of whose triangles
    // faces the axis, and across that triangle the cut runs backwards. Here the fold is in the triangle of ring 2,
    // vertices 1 and 2, and ring 3, and ring 2 lies short of the plane but for vertex 2, which lies beyond it. A
    // collapse across the fold is refused where the folded vertex is left with two loop vertices and one more for
    // neighbours, since the two then share that one as well.
    // The backward edge's second vertex is out of order, once the short edge before it has gone, and has to go into
    // the vertex after it.
    const second = cutPrism(5, (k, i) => [k === 2 ? (i === 2 ? 2.6 : 1.7) : k, 45 * i, 1], {
      k: 2,
      i: 1,
      at: [1.92, 40, 1],
    });
    expect(second.loop.length).toBeGreaterThanOrEqual(16);
    expectOneTurn(second);
    // With vertex 2 of ring 3 turned back to 50°, the backward edge's first vertex is out of order: without it the loop
    // runs forwards, and dropping the vertices after it instead comes to a collapse across the fold.
    const first = cutPrism(
      5,
      (k, i) => [k === 2 ? (i === 2 ? 2.1 : 1.9) : k, k === 3 && i === 2 ? 50 : 45 * i, 1],
      { k: 2, i: 1, at: [1.95, 75, 1] }
    );
    expect(first.loop.length).toBeGreaterThanOrEqual(16);
    expectOneTurn(first);
  });

  it('collapses no short loop edge where that turns a triangle over', () => {
    // Vertex 0 of ring 3 lies just short of the plane, turned back to -9°, and the cut runs round it in a row of short
    // edges, which collapse into the loop vertex at 4.5°. The last of them would take a corner of the sliver between
    // vertex 7 of ring 2 and vertex 0 of ring 3 past the line through those two, and turn it over. On a patch this
    // happens where the cut runs through the small triangles along a slab's border.
    const cut = cutPrism(
      5,
      (k, i) => (k === 3 && i === 0 ? [1.97, -9, 1] : [[0, 1, 1.88, 3, 4][k], 45 * i, 1]),
      undefined,
      0.3
    );
    expectOneTurn(cut);
    const { positions: P, normals: N, indices: I } = cut.out;
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, c] = [3 * I[t], 3 * I[t + 1], 3 * I[t + 2]];
      const u = [0, 1, 2].map((k) => P[b + k] - P[a + k]),
        v = [0, 1, 2].map((k) => P[c + k] - P[a + k]);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      expect(
        n[0] * (N[a] + N[b] + N[c]) +
          n[1] * (N[a + 1] + N[b + 1] + N[c + 1]) +
          n[2] * (N[a + 2] + N[b + 2] + N[c + 2])
      ).toBeGreaterThan(0);
    }
  });

  it('does not snap a vertex into the plane that the cut passes on both sides', () => {
    // The ring beyond the plane has one vertex just short of it, and the vertex behind that one lies short of it too:
    // around the first the surface crosses the plane four times, and in the plane it would pinch the boundary.
    const cut = cutPrism(5, (k, i) => [
      k === 2 ? (i === 3 ? 1.995 : 2.3) : k === 3 && i === 3 ? 1.95 : k,
      45 * i,
      1,
    ]);
    expectOneTurn(cut);
  });

  it('cuts along the curve that goes round the axis, not the ring around a vertex that dips across the plane', () => {
    // The first ring beyond the plane lies just beyond it, and one more vertex, in a triangle between that ring and the
    // next, lies just short of the plane and nearer the axis, as on a simplified stub. The plane meets the triangles
    // around that vertex in a small closed curve of its own, which comes closer to the axis (0.90) than the cut
    // (0.99) but does not go round it; the vertex goes with the stub.
    const cut = cutPrism(5, (k, i) => [[0, 1, 2.05, 3, 4][k], 45 * i, 1], {
      k: 2,
      i: 1,
      at: [1.97, 67.5, 0.9],
    });
    expect(cut.loop.length).toBeGreaterThanOrEqual(8);
    expectOneTurn(cut);
    const P = cut.out.positions;
    for (let v = 0; v < P.length; v += 3)
      if (P[v] > 1.5) expect(Math.hypot(P[v + 1], P[v + 2])).toBeGreaterThan(0.99);
  });

  it('fails when the plane does not cut off a stub', () => {
    // farLimit far too small for what lies beyond the plane.
    expect(() => {
      const L = 12,
        r = 0.8;
      const m = parseSwc(`1 3 0 0 0 ${r} -1\n2 3 ${L} 0 0 ${r} 1`);
      const mesh = buildMesh(m, params());
      clipMesh(
        mesh,
        mesh.center,
        [
          {
            cx: 3,
            cy: 0,
            cz: 0,
            nx: 1,
            ny: 0,
            nz: 0,
            reach: r + 0.4,
            farLimit: 2,
            snap: 0.02,
            minEdge: 0.1,
            maxSagitta: 0.05,
          },
        ],
        (_i, q) => {
          const len = Math.hypot(q[1], q[2]);
          q[1] *= r / len;
          q[2] *= r / len;
          q[3] = 0;
          q[4] = q[1] / r;
          q[5] = q[2] / r;
        }
      );
    }).toThrow(/stub/);
  });

  it('refuses a mesh too big for its edge keys to be exact, rather than join the wrong edges', () => {
    const n = 2 ** 20 + 1;
    const huge = {
      positions: new Float32Array(3 * n),
      normals: new Float32Array(3 * n),
      vertexTypes: new Uint8Array(n),
      radii: new Float32Array(n),
      indices: new Uint32Array(0),
    };
    expect(() => clipMesh(huge, [0, 0, 0], [], () => {})).toThrow(/more than 1048576/);
  });
});
