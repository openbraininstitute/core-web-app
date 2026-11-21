import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CELLS } from '@/features/learn/components/courses/skeleton/cells';
import {
  type CellInfo,
  distanceAlongSpines,
  parseCell,
  readArrays,
  sectionIndex,
  spineArrays,
} from '@/features/learn/components/courses/skeleton/engine/data';
import {
  cleanTriangles,
  orientByHints,
  outward,
  sectionMiddles,
  skeletonTubes,
  spineMeshes,
  vertexNormals,
} from '@/features/learn/components/courses/skeleton/engine/geometry';
import {
  glideAt,
  shotDistance,
  type Vec3,
} from '@/features/learn/components/courses/skeleton/engine/glide';
import {
  linearOf,
  paintSpines,
  rampAt,
  spinePalette,
} from '@/features/learn/components/courses/skeleton/engine/paint';
import {
  frameShot,
  pickShot,
  placed,
  type Quat,
} from '@/features/learn/components/courses/skeleton/engine/shots';
import { CELL, H5_TREE } from '@/features/learn/components/courses/skeleton/files';
import { h5Parts } from '@/features/learn/components/courses/skeleton/Inside';
import {
  CODE_CELLS,
  isCodeStep,
  LABELS,
  LAYOUTS,
  SKELETON_STEPS,
  type SkeletonStep,
  STATES,
} from '@/features/learn/components/courses/skeleton/views';
import { SKELETONIZATION_SLIDES } from '@/features/learn/slides/skeletonization';

const DIR = join(process.cwd(), 'public/static/learn/skeletonization');
const info = JSON.parse(readFileSync(join(DIR, 'cell.json'), 'utf8')) as CellInfo;
const arrayBuffer = (name: string) => {
  const b = readFileSync(join(DIR, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const bin = arrayBuffer('spines.bin');

describe('readArrays', () => {
  const buffer = new ArrayBuffer(28);
  new Float32Array(buffer, 0, 3).set([1.5, -2, 3]);
  new Uint32Array(buffer, 12, 2).set([7, 4000000000]);
  new Int32Array(buffer, 20, 1).set([-5]);
  new Uint8Array(buffer, 24, 4).set([1, 2, 3, 255]);

  it('views each array where the layout says, as its type', () => {
    const a = readArrays(buffer, {
      f: { type: 'f32', offset: 0, length: 3, itemSize: 3 },
      u: { type: 'u32', offset: 12, length: 2 },
      i: { type: 'i32', offset: 20, length: 1 },
      b: { type: 'u8', offset: 24, length: 4 },
    });
    expect(a.f).toBeInstanceOf(Float32Array);
    expect([...a.f]).toEqual([1.5, -2, 3]);
    expect([...a.u]).toEqual([7, 4000000000]);
    expect([...a.i]).toEqual([-5]);
    expect([...a.b]).toEqual([1, 2, 3, 255]);
    // views, not copies
    expect(a.f.buffer).toBe(buffer);
  });

  it('throws for an array past the end, a misaligned one, or an unknown type', () => {
    expect(() => readArrays(buffer, { f: { type: 'f32', offset: 16, length: 4 } })).toThrow(/past/);
    expect(() => readArrays(buffer, { f: { type: 'f32', offset: 2, length: 1 } })).toThrow(
      /aligned/
    );
    expect(() => readArrays(buffer, { f: { type: 'f64' as 'f32', offset: 0, length: 1 } })).toThrow(
      /unknown/
    );
  });

  it('insists on the arrays the figure draws from', () => {
    expect(() =>
      spineArrays(readArrays(buffer, { u: { type: 'u32', offset: 12, length: 2 } }))
    ).toThrow(/spinePositions/);
  });
});

describe('the shipped cell', () => {
  const all = readArrays(bin, info.arrays);
  const s = spineArrays(all);
  const n = info.counts.spines;
  const vertices = s.spinePositions.length / 3;

  it('has every array of cell.json inside spines.bin', () => {
    expect(Object.keys(all).sort()).toEqual(Object.keys(info.arrays).sort());
    for (const [name, spec] of Object.entries(info.arrays))
      expect(all[name].length, name).toBe(spec.length);
  });

  it('starts each spine where the last ended, through all the vertices and triangles', () => {
    for (const start of [s.spineVertexStart, s.spineTriangleStart, s.spineSkeletonPointStart])
      expect(start.length).toBe(n + 1);
    expect(s.spineVertexStart[0]).toBe(0);
    expect(s.spineVertexStart[n]).toBe(info.counts.spineMeshVertices);
    expect(s.spineTriangleStart[n]).toBe(info.counts.spineMeshTriangles);
    expect(s.spineTriangleStart[n] * 3).toBe(s.spineIndices.length);
    expect(s.spineSkeletonPointStart[n]).toBe(info.counts.spineSkeletonPoints);
    expect(s.spineSkeletonPointStart[n] * 4).toBe(s.spineSkeletonPoints.length);
    for (let i = 0; i < n; i++) {
      expect(s.spineVertexStart[i + 1]).toBeGreaterThan(s.spineVertexStart[i]);
      expect(s.spineTriangleStart[i + 1]).toBeGreaterThan(s.spineTriangleStart[i]);
    }
  });

  it("indexes only each spine's own vertices", () => {
    for (let i = 0; i < n; i++) {
      const lo = s.spineVertexStart[i],
        hi = s.spineVertexStart[i + 1];
      for (let k = 3 * s.spineTriangleStart[i]; k < 3 * s.spineTriangleStart[i + 1]; k++) {
        const v = s.spineIndices[k];
        if (v < lo || v >= hi) throw new Error(`spine ${i}: vertex ${v} outside ${lo}..${hi}`);
      }
    }
    expect(s.spineIndices.reduce((a, b) => Math.max(a, b), 0)).toBeLessThan(vertices);
    expect(s.spineLocalPositions.length).toBe(s.spinePositions.length);
  });

  it("joins only points of a spine's own skeleton", () => {
    const pointOf = (p: number) => {
      let i = 0;
      while (s.spineSkeletonPointStart[i + 1] <= p) i++;
      return i;
    };
    const points = s.spineSkeletonPoints.length / 4;
    for (let k = 0; k < s.spineSkeletonSegments.length; k += 2) {
      const a = s.spineSkeletonSegments[k],
        b = s.spineSkeletonSegments[k + 1];
      expect(a).toBeLessThan(points);
      expect(b).toBeLessThan(points);
      expect(pointOf(a)).toBe(pointOf(b));
    }
    expect(s.somaIndices.length % 3).toBe(0);
    expect(s.somaIndices.reduce((a, b) => Math.max(a, b), 0)).toBeLessThan(
      s.somaPositions.length / 3
    );
  });

  it('names a chosen spine and section that are there, and frames its shots', () => {
    expect(info.chosen.spine).toBeGreaterThanOrEqual(0);
    expect(info.chosen.spine).toBeLessThan(n);
    expect([...s.spineSection]).toContain(info.chosen.section);
    expect(info.reversedSpines).not.toContain(info.chosen.spine);
    for (const name of ['whole', 'soma', 'dendrite', 'spine'] as const) {
      const shot = info.shots[name];
      expect(Math.hypot(...shot.direction), name).toBeCloseTo(1, 3);
      expect(Math.hypot(...shot.up), name).toBeCloseTo(1, 3);
      // an up the camera can turn to: not along the way it looks
      const along = shot.direction.reduce((sum, v, k) => sum + v * shot.up[k], 0);
      expect(Math.abs(along), name).toBeLessThan(0.9);
      expect(shot.radius).toBeGreaterThan(0);
    }
  });

  it('reads the mesh with the EM viewer and the skeleton with the morphology viewer', () => {
    const cell = parseCell(
      info,
      bin,
      arrayBuffer('mesh.glb'),
      readFileSync(join(DIR, 'skeleton.swc'), 'utf8')
    );
    expect(cell.membrane.positions.length / 3).toBe(info.counts.meshVertices);
    expect(cell.membrane.indices.length / 3).toBe(info.counts.meshTriangles);
    expect(cell.morphology.sections.length).toBe(info.counts.skeletonSections);
    expect(cell.morphology.soma.model).toBe('point');
    // each spine's centre lies on the section its afferent_section_id names, less the offset
    for (let i = 0; i < n; i++) {
      const section =
        cell.morphology.sections[sectionIndex(s.spineSection[i], info.sectionIdOffset)];
      const c = [0, 1, 2].map((k) => s.spineCentre[3 * i + k]);
      let best = Infinity;
      const p = section.points;
      for (let k = 4; k + 3 < p.length; k += 4) {
        const a = [p[k - 4], p[k - 3], p[k - 2]],
          b = [p[k], p[k + 1], p[k + 2]];
        const ab = b.map((v, j) => v - a[j]);
        const t = Math.max(
          0,
          Math.min(
            1,
            ab.reduce((sum, v, j) => sum + v * (c[j] - a[j]), 0) /
              (ab.reduce((sum, v) => sum + v * v, 0) || 1)
          )
        );
        best = Math.min(best, Math.hypot(...c.map((v, j) => v - a[j] - t * ab[j])));
      }
      expect(best, `spine ${i}`).toBeLessThan(0.05);
    }
    const tubes = skeletonTubes(cell.morphology);
    expect(tubes.sections.length).toBe(tubes.geometry.getAttribute('position').count);
    expect(new Set(tubes.types)).toEqual(new Set([3]));
  });

  it('measures each spine from the end on its dendrite, the reversed ones from the other end', () => {
    const { distance, extent } = distanceAlongSpines(
      s.spineLocalPositions,
      s.spineVertexStart,
      info.reversedSpines
    );
    for (let i = 0; i < n; i++) {
      let lo = Infinity,
        hi = -Infinity;
      for (let v = s.spineVertexStart[i]; v < s.spineVertexStart[i + 1]; v++) {
        expect(distance[v]).toBeGreaterThanOrEqual(0);
        expect(distance[v]).toBeLessThanOrEqual(extent[i] + 1e-6);
        lo = Math.min(lo, distance[v]);
        hi = Math.max(hi, distance[v]);
      }
      expect(lo).toBe(0);
      expect(hi).toBeCloseTo(extent[i], 5);
      // the tip, local y = spine length, is far from the dendrite for a spine the right way round
      expect(extent[i]).toBeGreaterThanOrEqual(s.spineLength[i] - 1e-5);
    }
  });

  it('stores each spine from below its origin up to y = spine_length, as the slides say', () => {
    const below: number[] = [];
    for (let i = 0; i < n; i++) {
      let lo = Infinity,
        hi = -Infinity;
      for (let v = s.spineVertexStart[i]; v < s.spineVertexStart[i + 1]; v++) {
        const y = s.spineLocalPositions[3 * v + 1];
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
      expect(hi, `spine ${i}`).toBeCloseTo(s.spineLength[i], 4);
      expect(lo, `spine ${i}`).toBeLessThan(0);
      // a turned-round row's origin is nearer its free end, the lowest y, than its dendrite
      if (info.reversedSpines.includes(i)) expect(-lo, `spine ${i}`).toBeLessThan(hi);
      below.push(-lo);
    }
    const range = [Math.min(...below), Math.max(...below)].map((v) => Math.round(100 * v) / 100);
    expect(range).toEqual([...CELL.belowOrigin]);
  });

  it('cleans and orients the spine meshes, keeping each to its own vertices', () => {
    const unfit = new Set([
      ...info.checks.spinesWithOnePointSkeleton,
      ...info.checks.spinesWithSkeletonOutsideMesh,
    ]);
    const meshes = spineMeshes(s, info.chosen.spine, unfit);
    const own = meshes.chosen.getIndex()?.array as Uint32Array;
    const rest = meshes.rest.getIndex()?.array as Uint32Array;
    const lo = s.spineVertexStart[info.chosen.spine],
      hi = s.spineVertexStart[info.chosen.spine + 1];
    expect(own.length).toBeGreaterThan(0);
    for (const v of own) expect(v >= lo && v < hi).toBe(true);
    for (const v of rest) expect(v < lo || v >= hi).toBe(true);
    // fewer than the file's: its degenerate and repeated triangles are gone
    expect(own.length + rest.length).toBeLessThan(s.spineIndices.length);
    const normals = meshes.rest.getAttribute('normal').array as Float32Array;
    for (let v = 0; v < normals.length / 3; v += 97)
      expect(Math.hypot(normals[3 * v], normals[3 * v + 1], normals[3 * v + 2])).toBeCloseTo(1, 4);
  });
});

describe('the figure’s geometry', () => {
  // a tetrahedron, its faces wound to face in
  const tetra = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const inward = [0, 1, 2, 0, 3, 1, 0, 2, 3, 1, 3, 2];

  it('drops triangles that repeat a vertex, and keeps one of each set on the same vertices', () => {
    expect(cleanTriangles([0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 2, 3, 3, 2, 1], 0, 5)).toEqual([
      0, 1, 2, 1, 2, 3,
    ]);
    expect(cleanTriangles([0, 1, 2, 1, 2, 3], 1, 2)).toEqual([1, 2, 3]);
  });

  it('winds a closed mesh to face out', () => {
    const out = outward(tetra, inward);
    const normals = vertexNormals(tetra, out);
    // the far corner's normal points away from the middle
    expect(normals[9] + normals[10] + normals[11]).toBeGreaterThan(0);
    expect([...outward(tetra, out)]).toEqual([...out]);
  });

  it('winds each triangle the way its hint points', () => {
    const triangles = [...inward];
    const centre = [0.25, 0.25, 0.25];
    const turned = orientByHints(triangles, tetra, (c) => [
      c[0] - centre[0],
      c[1] - centre[1],
      c[2] - centre[2],
    ]);
    expect(turned).toBe(4);
    expect(
      orientByHints(triangles, tetra, (c) => [c[0] - centre[0], c[1] - centre[1], c[2] - centre[2]])
    ).toBe(0);
  });
});

describe('the camera’s glide', () => {
  it('stands back far enough for the shot’s sphere, in the narrower field of view', () => {
    const d = shotDistance(10, 45, 2);
    expect(d * Math.sin((22.5 * Math.PI) / 180)).toBeCloseTo(10, 6);
    expect(shotDistance(10, 45, 0.5)).toBeGreaterThan(d);
  });

  it('ends where it was going, and reaches a new subject early as it zooms in', () => {
    const from = { target: [0, 0, 0] as [number, number, number], distance: 80 };
    const to = { target: [20, 0, 0] as [number, number, number], distance: 4 };
    expect(glideAt(from, to, 0)).toEqual({ target: [0, 0, 0], distance: 80, turn: 0 });
    const end = glideAt(from, to, 1);
    expect(end.target[0]).toBeCloseTo(20, 9);
    expect(end.distance).toBeCloseTo(4, 9);
    const mid = glideAt(from, to, 0.5);
    expect(mid.distance).toBeCloseTo(Math.sqrt(80 * 4), 6);
    // the new subject is within the view's half height (distance × tan 22.5°) half way
    expect(20 - mid.target[0]).toBeLessThan(mid.distance * Math.tan((22.5 * Math.PI) / 180));
    const back = glideAt(to, from, 0.5);
    expect(back.target[0]).toBeGreaterThan(20 - back.distance * Math.tan((22.5 * Math.PI) / 180));
  });
});

describe('the figure’s colours', () => {
  it('gives each spine a colour of its own', () => {
    const palette = spinePalette(24);
    expect(new Set(palette).size).toBe(24);
    for (const c of palette) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('runs a ramp from its first stop to its last, in linear RGB', () => {
    expect(rampAt(['#000000', '#ffffff'], 0)).toEqual([0, 0, 0]);
    expect(rampAt(['#000000', '#ffffff'], 1)).toEqual([1, 1, 1]);
    expect(rampAt(['#000000', '#ffffff'], 0.5)[0]).toBeCloseTo(linearOf('#808080')[0], 2);
  });

  it('colours the chosen spine by distance from its dendrite and dims the rest', () => {
    const vertexStart = Uint32Array.from([0, 2, 4]);
    const target = new Float32Array(12);
    paintSpines(target, 'one', {
      vertexStart,
      distance: Float32Array.from([0, 1, 0, 2]),
      extent: Float32Array.from([1, 2]),
      length: Float32Array.from([1, 2]),
      lengthRange: [1, 2],
      section: Int32Array.from([3, 4]),
      chosen: 1,
      litSection: 4,
      palette: ['#ff0000', '#00ff00'],
      sectionPalette: [],
      sectionIdOffset: 1,
    });
    // spine 0 dimmed alike; spine 1 from the ramp's start at its base to its end at its tip
    expect([...target.slice(0, 3)]).toEqual([...target.slice(3, 6)]);
    expect([...target.slice(6, 9)].map((v) => v.toFixed(4))).toEqual(
      linearOf('#6a00a8').map((v) => v.toFixed(4))
    );
    expect(target[9]).toBeCloseTo(linearOf('#f0f921')[0], 4);
  });
});

describe('each spine’s own frame', () => {
  const s = spineArrays(readArrays(bin, info.arrays));
  const n = info.counts.spines;
  const v3 = (a: Float32Array, i: number): Vec3 => [a[3 * i], a[3 * i + 1], a[3 * i + 2]];
  const quat = (i: number) => [0, 1, 2, 3].map((k) => s.spineRotation[4 * i + k]) as Quat;
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  it('puts every spine on its dendrite by its rotation, then its translation', () => {
    // the convention the frame step animates: placed = rotate(spine_rotation, local) + translation
    for (let i = 0; i < n; i++) {
      const q = quat(i),
        t = v3(s.spineTranslation, i);
      let worst = 0;
      for (let v = s.spineVertexStart[i]; v < s.spineVertexStart[i + 1]; v++) {
        const p = placed(q, t, v3(s.spineLocalPositions, v));
        const want = v3(s.spinePositions, v);
        worst = Math.max(worst, Math.hypot(p[0] - want[0], p[1] - want[1], p[2] - want[2]));
      }
      expect(worst, `spine ${i}`).toBeLessThan(1e-3);
    }
  });

  it('turns +y to the spine’s direction', () => {
    for (let i = 0; i < n; i++) {
      const y = placed(quat(i), [0, 0, 0], [0, 1, 0]);
      expect(dot(y, v3(s.spineDirection, i)), `spine ${i}`).toBeCloseTo(1, 4);
    }
  });

  it('frames each row across its spine, its middle between root and tip', () => {
    const reversed = new Set(info.reversedSpines);
    for (let i = 0; i < n; i++) {
      const root = v3(s.spineRoot, i),
        d = v3(s.spineDirection, i),
        length = s.spineLength[i];
      const shot = pickShot(root, d, length, reversed.has(i), info.shots.whole.direction);
      expect(Math.hypot(...shot.direction), `row ${i}`).toBeCloseTo(1, 6);
      expect(Math.hypot(...shot.up), `row ${i}`).toBeCloseTo(1, 4);
      // looking across the spine, not along it
      expect(Math.abs(dot(shot.direction, d)), `row ${i}`).toBeLessThan(1e-6);
      const along = dot([0, 1, 2].map((k) => shot.target[k] - root[k]) as Vec3, d);
      expect(along).toBeGreaterThan(0);
      expect(along).toBeLessThan(length);
      expect(along).toBeCloseTo(length / 2, 5);
      // the far end from the dendrite up
      expect(dot(shot.up, d)).toBeCloseTo(reversed.has(i) ? -1 : 1, 4);
    }
  });

  it('starts the chosen spine upright beside its place, both in view', () => {
    const i = info.chosen.spine;
    let lo = Infinity,
      hi = -Infinity;
    for (let v = s.spineVertexStart[i]; v < s.spineVertexStart[i + 1]; v++) {
      lo = Math.min(lo, s.spineLocalPositions[3 * v + 1]);
      hi = Math.max(hi, s.spineLocalPositions[3 * v + 1]);
    }
    const t = v3(s.spineTranslation, i);
    const { shot, start } = frameShot(t, quat(i), lo, hi, info.shots.whole.direction);
    expect(Math.hypot(...shot.direction)).toBeCloseTo(1, 6);
    expect(shot.up).toEqual([0, 1, 0]);
    expect(Math.abs(shot.direction[1])).toBeLessThan(1e-9);
    const gap = Math.hypot(start[0] - t[0], start[1] - t[1], start[2] - t[2]);
    expect(gap).toBeGreaterThan(hi - lo);
    for (const p of [start, t])
      expect(Math.hypot(...([0, 1, 2].map((k) => p[k] - shot.target[k]) as Vec3))).toBeLessThan(
        shot.radius
      );
  });
});

describe('the figure’s steps', () => {
  const steps = new Set<string>(SKELETON_STEPS);

  it('has a view, a layout and a label for every skeleton step the slides use', () => {
    const used = SKELETONIZATION_SLIDES.map((slide) => String(slide.widget ?? '')).filter((w) =>
      w.startsWith('skeleton:')
    );
    expect(used.length).toBeGreaterThan(0);
    for (const widget of used) {
      const step = widget.slice('skeleton:'.length) as keyof typeof STATES;
      expect(steps.has(step), widget).toBe(true);
      expect(STATES[step], widget).toBeDefined();
      expect(LAYOUTS[step], widget).toBeDefined();
      expect(LABELS[step], widget).toBeTruthy();
    }
  });

  it('puts the workflow and the files in their sections', () => {
    const sections = SKELETONIZATION_SLIDES.filter((slide) => slide.section).map((x) => x.section);
    expect(sections).toContain('The skeletonization workflow');
    expect(sections).toContain('Inside the files');
    expect(sections).toContain('In Python');
  });

  it('has a recorded cell for every code step the slides use, and no cell left over', () => {
    const used = SKELETONIZATION_SLIDES.map((slide) => String(slide.widget ?? ''))
      .filter((w) => w.startsWith('skeleton:'))
      .map((w) => w.slice('skeleton:'.length) as SkeletonStep);
    const code = used.filter(isCodeStep);
    expect(code.length).toBeGreaterThan(0);
    for (const step of code) {
      const cell = CELLS[CODE_CELLS[step]];
      expect(cell, step).toBeDefined();
      expect(cell.code.length, step).toBeGreaterThan(0);
      expect(cell.output.length, step).toBeGreaterThan(0);
      for (const line of cell.lit) expect(line).toBeLessThanOrEqual(cell.code.split('\n').length);
    }
    expect(new Set(Object.values(CODE_CELLS))).toEqual(new Set(Object.keys(CELLS)));
    // fetching needs a login: it is shown as code, with no output
    expect(isCodeStep('fetch')).toBe(false);
  });

  it("records cells that agree with the course's data", () => {
    expect(CELLS.load.output).toContain(`${CELL.sections} sections, ${CELL.counts.spines} spines`);
    expect(CELLS.table.code).toContain(`spine_indices_for_section(${CELL.chosen.section})`);
    expect(CELLS.table.code).toContain(
      `sections[${CELL.chosen.section} - ${CELL.sectionIdOffset}]`
    );
    expect(CELLS.table.output).toContain(`${CELL.spinesPerUm} spines per µm`);
    expect(CELLS.meshes.code.startsWith(`i = ${CELL.chosen.spine}\n`)).toBe(true);
    expect(CELLS.skeleton.output).toContain(`${CELL.totalLength} µm in ${CELL.sections} sections`);
    expect(CELLS.validate.output).toContain('Validation result: VALID');
  });

  it('ends on the things to remember, then a way to another course', () => {
    const [gotchas, last] = SKELETONIZATION_SLIDES.slice(-2);
    expect(gotchas.widget).toBe('skeleton:gotchas');
    expect(last.widget).toBe('skeleton:gotchas');
    expect(last.cta).toBeDefined();
  });

  it('reads the spiny H5 as its five parts', () => {
    const parts = h5Parts(H5_TREE);
    expect(parts.map((p) => p.part)).toEqual([
      'edges',
      'morphology',
      'soma',
      'spine-meshes',
      'spine-skeletons',
    ]);
    for (const p of parts) expect(p.datasets.length, p.part).toBeGreaterThanOrEqual(2);
    expect(parts[0].datasets.length).toBe(info.counts.spines > 0 ? 20 : 0);
    expect(parts[0].metadata?.attrs?.version).toEqual([1, 0]);
    expect(parts[3].datasets.map((d) => d.path.split('/').at(-1))).toEqual([
      'offsets',
      'triangles',
      'vertices',
    ]);
  });

  it('labels each section half way along it', () => {
    const cell = parseCell(
      info,
      bin,
      arrayBuffer('mesh.glb'),
      readFileSync(join(DIR, 'skeleton.swc'), 'utf8')
    );
    const middles = sectionMiddles(cell.morphology);
    expect(middles.length).toBe(cell.morphology.sections.length);
    cell.morphology.sections.forEach((section, k) => {
      const p = section.points;
      let best = Infinity;
      for (let j = 0; j + 3 < p.length; j += 4)
        best = Math.min(
          best,
          Math.hypot(p[j] - middles[k][0], p[j + 1] - middles[k][1], p[j + 2] - middles[k][2])
        );
      // on the polyline, so within a segment of one of its points
      expect(best, `section ${k}`).toBeLessThan(3);
    });
  });
});
