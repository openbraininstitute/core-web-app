/**
 * A neuron with its branches rounded: MouseLight traces dendrites with a node
 * every 15–40 µm, and straight runs meeting at sharp corners read as wire, not
 * as living branches. Each segment is cut into pieces of at most `step` µm
 * (finer on dendrites than axons), then every point along an unbranched run is
 * eased towards its neighbours a few times over — branch points, tips and the
 * soma stay put — so corners become curves.
 *
 * The result is a Neuron like any other, its paths and lengths recomputed.
 */

import type { Neuron } from './data';

export function rounded(n: Neuron, dendStep = 4, axonStep = 30, passes = 4): Neuron {
  const count = n.x.length;
  const x: number[] = [n.x[0]];
  const y: number[] = [n.y[0]];
  const z: number[] = [n.z[0]];
  const type: number[] = [n.type[0]];
  const parent: number[] = [-1];
  const width: number[] = [n.width[0]];
  const to = new Int32Array(count);
  for (let i = 1; i < count; i++) {
    const p = n.parent[i];
    const len = Math.hypot(n.x[i] - n.x[p], n.y[i] - n.y[p], n.z[i] - n.z[p]);
    const pieces = Math.max(1, Math.ceil(len / (n.type[i] === 2 ? axonStep : dendStep)));
    let prev = to[p];
    for (let k = 1; k <= pieces; k++) {
      const f = k / pieces;
      x.push(n.x[p] + (n.x[i] - n.x[p]) * f);
      y.push(n.y[p] + (n.y[i] - n.y[p]) * f);
      z.push(n.z[p] + (n.z[i] - n.z[p]) * f);
      type.push(n.type[i]);
      parent.push(prev);
      width.push(p === 0 ? n.width[i] : n.width[p] + (n.width[i] - n.width[p]) * f);
      prev = x.length - 1;
    }
    to[i] = prev;
  }

  const total = x.length;
  const kids = new Int32Array(total);
  for (let i = 1; i < total; i++) kids[parent[i]]++;
  // the one child of each point along an unbranched run
  const only = new Int32Array(total).fill(-1);
  for (let i = 1; i < total; i++) if (kids[parent[i]] === 1) only[parent[i]] = i;
  const xs = Float32Array.from(x);
  const ys = Float32Array.from(y);
  const zs = Float32Array.from(z);
  const nx = new Float32Array(total);
  const ny = new Float32Array(total);
  const nz = new Float32Array(total);
  for (let pass = 0; pass < passes; pass++) {
    nx.set(xs);
    ny.set(ys);
    nz.set(zs);
    for (let i = 1; i < total; i++) {
      const c = only[i];
      const p = parent[i];
      if (c < 0 || p <= 0) continue;
      nx[i] = 0.5 * xs[i] + 0.25 * (xs[p] + xs[c]);
      ny[i] = 0.5 * ys[i] + 0.25 * (ys[p] + ys[c]);
      nz[i] = 0.5 * zs[i] + 0.25 * (zs[p] + zs[c]);
    }
    xs.set(nx);
    ys.set(ny);
    zs.set(nz);
  }

  const dist = new Float32Array(total);
  for (let i = 1; i < total; i++) {
    const p = parent[i];
    dist[i] = dist[p] + Math.hypot(xs[i] - xs[p], ys[i] - ys[p], zs[i] - zs[p]);
  }
  let dendritePath = 1;
  let axonPath = 0;
  for (let i = 0; i < total; i++) {
    if (type[i] === 2) axonPath = Math.max(axonPath, dist[i]);
    else dendritePath = Math.max(dendritePath, dist[i]);
  }
  const toSoma = (i: number) => {
    const path: number[] = [];
    for (let k = i; k >= 0; k = parent[k]) path.push(k);
    return path;
  };
  const tip = (i: number) => to[i];
  return {
    ...n,
    x: xs,
    y: ys,
    z: zs,
    type: Uint8Array.from(type),
    parent: Int32Array.from(parent),
    width: Float32Array.from(width),
    dist,
    dendritePath,
    axonPath,
    inputs: n.inputs.map((path) => toSoma(tip(path[0]))),
    output: n.output.length ? toSoma(tip(n.output[n.output.length - 1])).reverse() : [],
  };
}
