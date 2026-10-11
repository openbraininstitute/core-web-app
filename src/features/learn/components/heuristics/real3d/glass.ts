/**
 * The brain as glass, in WebGL: its surface smoothed, cut finer, and shaded
 * pixel by pixel from normals that vary smoothly across it — a clear shell,
 * bright where it turns edge-on to the eye, crisp at any zoom, with no facets
 * and no blur. On white it is the other way about: added light would vanish,
 * so the glass is laid over as a tint, darkening where it turns edge-on.
 *
 * One WebGL canvas serves every figure: each frame is drawn into it and then
 * laid over the figure's own 2D canvas. Without WebGL, `renderGlass` returns
 * null and the caller draws `surface(m, false)` itself.
 */

import type { RGB } from '../shared';
import type { Mesh, V3 } from './data';
import type { View } from './space';

/** A surface ready to shade: vertices and their normals, flat (x, y, z) triples, and triangles. */
export interface Surface {
  v: Float32Array;
  n: Float32Array;
  f: Uint32Array;
}

/** Each vertex's neighbours, packed: those of vertex i are list[start[i]] up to list[start[i + 1]]. */
function neighbours(count: number, f: Uint32Array) {
  const sets = Array.from({ length: count }, () => new Set<number>());
  for (let i = 0; i < f.length; i += 3) {
    const [a, b, c] = [f[i], f[i + 1], f[i + 2]];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  const start = new Uint32Array(count + 1);
  for (let i = 0; i < count; i++) start[i + 1] = start[i] + sets[i].size;
  const list = new Uint32Array(start[count]);
  for (let i = 0; i < count; i++) {
    let k = start[i];
    for (const j of sets[i]) list[k++] = j;
  }
  return { start, list };
}

/** Taubin's smoothing: a step towards the neighbours' mean, then a slightly larger one back, so the surface smooths without shrinking. */
function taubin(v: Float32Array, f: Uint32Array, rounds: number) {
  const count = v.length / 3;
  const { start, list } = neighbours(count, f);
  const next = new Float32Array(v.length);
  const step = (k: number) => {
    for (let i = 0; i < count; i++) {
      const many = start[i + 1] - start[i];
      for (let d = 0; d < 3; d++) {
        let mean = 0;
        for (let j = start[i]; j < start[i + 1]; j++) mean += v[list[j] * 3 + d];
        next[i * 3 + d] = many ? v[i * 3 + d] + k * (mean / many - v[i * 3 + d]) : v[i * 3 + d];
      }
    }
    v.set(next);
  };
  for (let r = 0; r < rounds; r++) {
    step(0.5);
    step(-0.53);
  }
}

/** Every triangle cut into four at its edges' midpoints, keeping its winding. */
function subdivide(v: Float32Array, f: Uint32Array) {
  const count = v.length / 3;
  const out: number[] = Array.from(v);
  const mids = new Map<number, number>();
  const mid = (a: number, b: number) => {
    const key = a < b ? a * count + b : b * count + a;
    let m = mids.get(key);
    if (m === undefined) {
      m = out.length / 3;
      out.push(
        (v[a * 3] + v[b * 3]) / 2,
        (v[a * 3 + 1] + v[b * 3 + 1]) / 2,
        (v[a * 3 + 2] + v[b * 3 + 2]) / 2
      );
      mids.set(key, m);
    }
    return m;
  };
  const faces = new Uint32Array(f.length * 4);
  for (let i = 0; i < f.length; i += 3) {
    const [a, b, c] = [f[i], f[i + 1], f[i + 2]];
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    faces.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], i * 4);
  }
  return { v: Float32Array.from(out), f: faces };
}

/** Each vertex's normal: the faces' around it, weighted by their area. The meshes are wound outward, so these face out. */
function normals(v: Float32Array, f: Uint32Array) {
  const n = new Float32Array(v.length);
  for (let i = 0; i < f.length; i += 3) {
    const [a, b, c] = [f[i] * 3, f[i + 1] * 3, f[i + 2] * 3];
    const ux = v[b] - v[a];
    const uy = v[b + 1] - v[a + 1];
    const uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a];
    const wy = v[c + 1] - v[a + 1];
    const wz = v[c + 2] - v[a + 2];
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    for (const p of [a, b, c]) {
      n[p] += nx;
      n[p + 1] += ny;
      n[p + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

const surfaces = new WeakMap<Mesh, { coarse?: Surface; fine?: Surface }>();

/** The mesh smoothed — and, `fine`, cut into four and smoothed again, for a smooth outline too. */
export function surface(m: Mesh, fine: boolean): Surface {
  let entry = surfaces.get(m);
  if (!entry) {
    entry = {};
    surfaces.set(m, entry);
  }
  if (!entry.coarse) {
    const v = Float32Array.from(m.v);
    taubin(v, m.f, 6);
    entry.coarse = { v, n: normals(v, m.f), f: Uint32Array.from(m.f) };
  }
  if (fine && !entry.fine) {
    const cut = subdivide(entry.coarse.v, entry.coarse.f);
    taubin(cut.v, cut.f, 4);
    entry.fine = { v: cut.v, n: normals(cut.v, cut.f), f: cut.f };
  }
  return fine ? entry.fine! : entry.coarse;
}

/* ------------------------------------------------------------------- WebGL */

const VERTEX = `
attribute vec3 position;
attribute vec3 normal;
uniform mat3 rot;    // a rigid move: turned about the pivot, then shifted
uniform vec3 pivot;
uniform vec3 shift;
uniform vec3 centre;
uniform vec4 turn;   // cos yaw, sin yaw, cos pitch, sin pitch
uniform vec2 roll;   // cos and sin of the picture's spin about the line of sight
uniform vec3 screen; // px per µm, and where the centre lands, px
uniform vec2 size;   // the canvas, CSS px
varying vec3 seen;   // the normal, turned into the view: right, down, away
vec2 spun(vec2 d) {
  return vec2(d.x * roll.x - d.y * roll.y, d.x * roll.y + d.y * roll.x);
}
void main() {
  vec3 q = rot * (position - pivot) + pivot + shift - centre;
  float z1 = q.x * turn.y + q.z * turn.x;
  vec2 p = screen.yz + screen.x * spun(vec2(q.x * turn.x - q.z * turn.y, q.y * turn.z - z1 * turn.w));
  gl_Position = vec4(p.x / size.x * 2.0 - 1.0, 1.0 - p.y / size.y * 2.0, 0.0, 1.0);
  vec3 m = rot * normal;
  float n1 = m.x * turn.y + m.z * turn.x;
  seen = vec3(spun(vec2(m.x * turn.x - m.z * turn.y, m.y * turn.z - n1 * turn.w)), m.y * turn.w + n1 * turn.z);
}`;

const FRAGMENT = `
precision mediump float;
varying vec3 seen;
uniform vec3 tint;
uniform float strength;
uniform vec3 shine; // halfway between the light and the eye, in the view
uniform float white;
void main() {
  vec3 n = normalize(seen);
  if (white > 0.5) {
    // a faint tint across its face, deepening at its edges
    float a = (0.025 + 0.5 * pow(1.0 - abs(n.z), 1.6)) * strength;
    gl_FragColor = vec4(tint * a, a);
    return;
  }
  float rim = pow(1.0 - abs(n.z), 2.4);
  float glint = pow(abs(dot(n, shine)), 40.0) * (n.z < 0.0 ? 0.8 : 0.25);
  float b = (0.03 + 0.7 * rim + glint) * strength;
  gl_FragColor = vec4(tint * b, b);
}`;

interface GL {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  program: WebGLProgram;
  uints: boolean;
  attr: { position: number; normal: number };
  uni: Record<
    | 'rot'
    | 'pivot'
    | 'shift'
    | 'centre'
    | 'turn'
    | 'roll'
    | 'screen'
    | 'size'
    | 'tint'
    | 'strength'
    | 'shine'
    | 'white',
    WebGLUniformLocation | null
  >;
}

let shared: GL | null = null;
let unavailable = false;

function setup(): GL | null {
  if (unavailable) return null;
  if (shared && !shared.gl.isContextLost()) return shared;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    unavailable = true;
    return null;
  }
  const compile = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) {
    unavailable = true;
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    unavailable = true;
    return null;
  }
  const uni = (name: string) => gl.getUniformLocation(program, name);
  shared = {
    gl,
    canvas,
    program,
    uints: !!gl.getExtension('OES_element_index_uint'),
    attr: {
      position: gl.getAttribLocation(program, 'position'),
      normal: gl.getAttribLocation(program, 'normal'),
    },
    uni: {
      rot: uni('rot'),
      pivot: uni('pivot'),
      shift: uni('shift'),
      centre: uni('centre'),
      turn: uni('turn'),
      roll: uni('roll'),
      screen: uni('screen'),
      size: uni('size'),
      tint: uni('tint'),
      strength: uni('strength'),
      shine: uni('shine'),
      white: uni('white'),
    },
  };
  return shared;
}

const uploaded = new WeakMap<
  Mesh,
  { gl: WebGLRenderingContext; data: WebGLBuffer; index: WebGLBuffer; count: number; type: number }
>();

function buffers(g: GL, m: Mesh) {
  const ready = uploaded.get(m);
  if (ready && ready.gl === g.gl) return ready;
  const s = surface(m, true);
  const count = s.v.length / 3;
  if (count > 65535 && !g.uints) return null;
  const { gl } = g;
  const interleaved = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    interleaved.set(s.v.subarray(i * 3, i * 3 + 3), i * 6);
    interleaved.set(s.n.subarray(i * 3, i * 3 + 3), i * 6 + 3);
  }
  const data = gl.createBuffer();
  const index = gl.createBuffer();
  if (!data || !index) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, data);
  gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  const wide = count > 65535;
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wide ? s.f : Uint16Array.from(s.f), gl.STATIC_DRAW);
  const entry = {
    gl,
    data,
    index,
    count: s.f.length,
    type: wide ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
  };
  uploaded.set(m, entry);
  return entry;
}

export interface GlassLayer {
  mesh: Mesh;
  tint: RGB;
  strength: number;
  /** Moved as one rigid piece: turned by `rot` (3 × 3, row by row) about `pivot`, then shifted; µm. Still, without. */
  move?: { rot: number[]; pivot: V3; shift: V3 };
}

const STILL = { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pivot: [0, 0, 0] as V3, shift: [0, 0, 0] as V3 };

/**
 * The layers drawn as glass into a canvas `width` × `height` device px (CSS px
 * × `dpr`) seen through `v` — added together, or with `white`, laid over each
 * other as tints; `shine` is the view's half vector, for the glint. Returns
 * that canvas, or null without WebGL.
 */
export function renderGlass(
  width: number,
  height: number,
  dpr: number,
  v: View,
  shine: V3,
  layers: GlassLayer[],
  white = false
) {
  const g = setup();
  if (!g) return null;
  const { gl, canvas, uni, attr } = g;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
  gl.useProgram(g.program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  // added together on a dark ground; laid over each other, as tints, on white
  if (white) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  else gl.blendFunc(gl.ONE, gl.ONE);
  gl.uniform1f(uni.white, white ? 1 : 0);
  gl.uniform3f(uni.centre, v.c[0], v.c[1], v.c[2]);
  gl.uniform4f(uni.turn, v.ct, v.st, v.cp, v.sp);
  gl.uniform2f(uni.roll, v.cr, v.sr);
  gl.uniform3f(uni.screen, v.s, v.ox, v.oy);
  gl.uniform2f(uni.size, width / dpr, height / dpr);
  gl.uniform3f(uni.shine, shine[0], shine[1], shine[2]);
  for (const layer of layers) {
    if (layer.strength < 0.01) continue;
    const b = buffers(g, layer.mesh);
    if (!b) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.data);
    gl.enableVertexAttribArray(attr.position);
    gl.vertexAttribPointer(attr.position, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(attr.normal);
    gl.vertexAttribPointer(attr.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.index);
    const { rot, pivot, shift } = layer.move ?? STILL;
    // GLSL reads matrices column by column
    gl.uniformMatrix3fv(uni.rot, false, [
      rot[0],
      rot[3],
      rot[6],
      rot[1],
      rot[4],
      rot[7],
      rot[2],
      rot[5],
      rot[8],
    ]);
    gl.uniform3f(uni.pivot, pivot[0], pivot[1], pivot[2]);
    gl.uniform3f(uni.shift, shift[0], shift[1], shift[2]);
    gl.uniform3f(uni.tint, layer.tint[0] / 255, layer.tint[1] / 255, layer.tint[2] / 255);
    gl.uniform1f(uni.strength, layer.strength);
    gl.drawElements(gl.TRIANGLES, b.count, b.type, 0);
  }
  return canvas;
}
