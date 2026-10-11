/**
 * The 3D Golgi heuristics' data: a stippled mouse brain and real neuron
 * reconstructions, built by scripts/heuristics-data.ts into public/heuristics.
 * Fetched once each and kept, so switching variants does not fetch again.
 *
 * Everything is in the Allen CCF frame: (AP, DV, ML) in µm.
 */

export type V3 = [number, number, number];

/** A surface: vertices as flat (AP, DV, ML) triples, µm, and triangles as vertex indices, wound to face out. */
export interface Mesh {
  v: Float32Array;
  f: Uint32Array;
}

export interface Brain {
  /** Surface points of the whole brain, flat (AP, DV, ML) triples, µm. */
  root: Float32Array;
  regions: Record<string, Float32Array>;
  names: Record<string, string>;
}

export interface Neuron {
  id: string;
  cell: string;
  region: string;
  source: string;
  soma: V3;
  /** The soma's radius, µm: the reconstruction's own, or a typical one. */
  somaRadius: number;
  /** The whole axon as reconstructed, before simplifying: µm of it, and how many ends. */
  axon: { length: number; tips: number };
  /** Node positions relative to the soma, µm; node 0 is the soma. */
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  /** SWC types: 1 soma, 2 axon, 3 basal, 4 apical. */
  type: Uint8Array;
  parent: Int32Array;
  /** Branch diameter at each node, µm: the reconstruction's own, or tapered by how much hangs off it. */
  width: Float32Array;
  /** Whether those diameters were measured, rather than made up here. */
  measured: boolean;
  /** Path length from the soma, µm. */
  dist: Float32Array;
  /** How far the dendrites reach from the soma, straight-line, µm. */
  dendriteReach: number;
  /** The longest path along the dendrites, and along the axon, µm. */
  dendritePath: number;
  axonPath: number;
  /** Paths from chosen dendrite tips in to the soma, and from the soma out along the axon (node indices). */
  inputs: number[][];
  output: number[];
}

const json = new Map<string, Promise<unknown>>();
const load = (url: string) => {
  if (!json.has(url))
    json.set(
      url,
      fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: ${r.status}`))))
    );
  return json.get(url)!;
};

const brainCache: { value: Brain | null; promise: Promise<Brain> | null } = {
  value: null,
  promise: null,
};

export function loadBrain(): Promise<Brain> {
  brainCache.promise ??= load('/static/learn/heuristics/brain.json').then((raw) => {
    const b = raw as {
      root: number[];
      regions: Record<string, number[]>;
      names: Record<string, string>;
    };
    const scale = (a: number[]) => Float32Array.from(a, (v) => v * 10);
    brainCache.value = {
      root: scale(b.root),
      regions: Object.fromEntries(Object.entries(b.regions).map(([k, v]) => [k, scale(v)])),
      names: b.names,
    };
    return brainCache.value;
  });
  return brainCache.promise;
}

const meshes = new Map<string, Promise<Mesh>>();

/** The brain's surface ("root"), or a region's, by its key in brain.json. */
export function loadMesh(name: string): Promise<Mesh> {
  if (!meshes.has(name)) {
    meshes.set(
      name,
      load(`/static/learn/heuristics/mesh/${name}.json`).then((raw) => {
        const m = raw as { v: number[]; f: number[] };
        return { v: Float32Array.from(m.v, (x) => x * 10), f: Uint32Array.from(m.f) };
      })
    );
  }
  return meshes.get(name)!;
}

/** A glial cell in its own frame: soma at the origin, widest along x, thinnest along z; µm. */
export interface Glia {
  id: string;
  cell: string;
  source: string;
  somaRadius: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  /** Process radius at each node, µm, and each node's parent; node 0 is the soma. */
  r: Float32Array;
  parent: Int32Array;
}

export function loadGlia(id: string): Promise<Glia> {
  return load(`/static/learn/heuristics/glia/${id}.json`).then((raw) => {
    const g = raw as { id: string; cell: string; source: string; soma: number } & Record<
      'x' | 'y' | 'z' | 'r' | 'p',
      number[]
    >;
    return {
      id: g.id,
      cell: g.cell,
      source: g.source,
      somaRadius: g.soma,
      x: Float32Array.from(g.x),
      y: Float32Array.from(g.y),
      z: Float32Array.from(g.z),
      r: Float32Array.from(g.r),
      parent: Int32Array.from(g.p),
    };
  });
}

const neurons = new Map<string, Neuron>();

export function loadNeuron(id: string): Promise<Neuron> {
  if (neurons.has(id)) return Promise.resolve(neurons.get(id)!);
  return load(`/static/learn/heuristics/neurons/${id}.json`).then((raw) => {
    const n = decode(raw as RawNeuron);
    neurons.set(id, n);
    return n;
  });
}

interface RawNeuron {
  id: string;
  cell: string;
  region: string;
  source: string;
  soma: V3;
  axon: { length: number; tips: number };
  x: number[];
  y: number[];
  z: number[];
  r: number[];
  t: number[];
  p: number[];
}

function decode(raw: RawNeuron): Neuron {
  const n = raw.x.length;
  const x = Float32Array.from(raw.x);
  const y = Float32Array.from(raw.y);
  const z = Float32Array.from(raw.z);
  const type = Uint8Array.from(raw.t);
  const parent = Int32Array.from(raw.p);

  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) if (parent[i] >= 0) kids[parent[i]].push(i);

  // parents come before children, so one pass each way does it
  const dist = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const p = parent[i];
    dist[i] = dist[p] + Math.hypot(x[i] - x[p], y[i] - y[p], z[i] - z[p]);
  }
  const tips = new Float32Array(n);
  for (let i = n - 1; i >= 1; i--) {
    if (!kids[i].length) tips[i] = 1;
    if (parent[i] >= 0) tips[parent[i]] += tips[i];
  }

  const measured = raw.r.some((v) => v > 0);
  const width = Float32Array.from({ length: n }, (_, i) => {
    if (i === 0) return 16;
    if (measured) return Math.max(0.4, (raw.r[i] / 10) * 2);
    // no radii: thicker where more of the tree hangs off, as real branches are
    return type[i] === 2
      ? Math.min(1.6, 0.35 + 0.12 * Math.sqrt(tips[i]))
      : Math.min(4, 0.5 + 0.55 * Math.sqrt(tips[i]));
  });

  let dendriteReach = 1;
  let dendritePath = 1;
  let axonPath = 0;
  for (let i = 0; i < n; i++) {
    if (type[i] === 2) axonPath = Math.max(axonPath, dist[i]);
    if (type[i] === 3 || type[i] === 4) {
      dendriteReach = Math.max(dendriteReach, Math.hypot(x[i], y[i], z[i]));
      dendritePath = Math.max(dendritePath, dist[i]);
    }
  }

  const toSoma = (i: number) => {
    const path: number[] = [];
    for (let k = i; k >= 0; k = parent[k]) path.push(k);
    return path;
  };
  // the furthest tip on each primary dendrite: the signals' way in
  const primary = (i: number) => {
    let k = i;
    while (parent[k] > 0) k = parent[k];
    return k;
  };
  const best = new Map<number, number>();
  for (let i = 1; i < n; i++) {
    if (kids[i].length || (type[i] !== 3 && type[i] !== 4)) continue;
    const root = primary(i);
    if (!best.has(root) || dist[i] > dist[best.get(root)!]) best.set(root, i);
  }
  const inputs = [...best.values()]
    .sort((a, b) => dist[b] - dist[a])
    .slice(0, 7)
    .map(toSoma);
  // and out: the soma to the axon's furthest tip, as the crow flies (the longest path can end up back near home)
  const away = (i: number) => Math.hypot(x[i], y[i], z[i]);
  let far = -1;
  for (let i = 1; i < n; i++)
    if (type[i] === 2 && !kids[i].length && (far < 0 || away(i) > away(far))) far = i;
  const output = far < 0 ? [] : toSoma(far).reverse();

  const somaRadius = raw.r[0] > 0 ? raw.r[0] / 10 : 7;
  return {
    ...raw,
    measured,
    somaRadius,
    x,
    y,
    z,
    type,
    parent,
    width,
    dist,
    dendriteReach,
    dendritePath,
    axonPath,
    inputs,
    output,
  };
}
