/**
 * A neuron simulated in the page, the way NEURON and Jaxley simulate one: the
 * course's drawn pyramidal cell cut into compartments, each a patch of
 * membrane with Hodgkin–Huxley channels, joined to its neighbours through the
 * fluid inside; stepped through time by backward Euler, every voltage solved
 * for at once by the Hines algorithm — the tips folded into their parents,
 * down to the soma, then solved back out.
 */

import type { Morphology, SegKind } from '@/features/learn/lib/basics/morphologies';

/** One compartment: its parent (the soma's is −1), where it lies in the drawing, and its size (µm) and membrane area (cm²). */
interface Compartment {
  parent: number;
  kind: SegKind | 'soma';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
  diam: number;
  area: number;
}

/**
 * The morphology cut into compartments no longer than `most` µm, the soma
 * first and every compartment after its parent: the order the Hines
 * algorithm needs. Each of the drawing's units is `scale` µm along a branch;
 * its line widths are the branches' diameters, in µm.
 */
export function compartmentsOf(m: Morphology, scale = 4, most = 30): Compartment[] {
  const r = m.soma.r;
  const out: Compartment[] = [
    {
      parent: -1,
      kind: 'soma',
      x0: m.soma.x,
      y0: m.soma.y,
      x1: m.soma.x,
      y1: m.soma.y,
      len: 20,
      diam: 20,
      area: 0,
    },
  ];
  /** Which compartment ends where: a segment starting there hangs off it. */
  const endsAt = new Map<string, number>();
  const key = (x: number, y: number) => `${x.toFixed(4)},${y.toFixed(4)}`;
  for (const s of m.segs) {
    const fromSoma = Math.hypot(s.x1 - m.soma.x, s.y1 - m.soma.y) <= r + 1e-6;
    let parent = fromSoma ? 0 : (endsAt.get(key(s.x1, s.y1)) ?? 0);
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) * scale;
    const n = Math.max(1, Math.ceil(len / most));
    for (let k = 0; k < n; k++) {
      const [a, b] = [k / n, (k + 1) / n];
      out.push({
        parent,
        kind: s.kind,
        x0: s.x1 + (s.x2 - s.x1) * a,
        y0: s.y1 + (s.y2 - s.y1) * a,
        x1: s.x1 + (s.x2 - s.x1) * b,
        y1: s.y1 + (s.y2 - s.y1) * b,
        len: len / n,
        diam: Math.max(0.6, s.w),
        area: 0,
      });
      parent = out.length - 1;
    }
    endsAt.set(key(s.x2, s.y2), parent);
  }
  for (const c of out) c.area = Math.PI * c.diam * c.len * 1e-8;
  return out;
}

/* Hodgkin–Huxley's squid axon: mS/cm², mV, ms. */
const HH = { gNa: 120, gK: 36, gL: 0.3, eNa: 50, eK: -77, eL: -54.3 };
const vtrap = (x: number, y: number) =>
  Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (Math.exp(x / y) - 1);
const rates = (v: number) => ({
  am: 0.1 * vtrap(-(v + 40), 10),
  bm: 4 * Math.exp(-(v + 65) / 18),
  ah: 0.07 * Math.exp(-(v + 65) / 20),
  bh: 1 / (Math.exp(-(v + 35) / 10) + 1),
  an: 0.01 * vtrap(-(v + 55), 10),
  bn: 0.125 * Math.exp(-(v + 65) / 80),
});

/** The neuron's state, stepped forward by backward Euler; current can be injected into its soma. */
export class TreeSim {
  readonly n: number;
  readonly parent: Int32Array;
  v: Float64Array;
  private m: Float64Array;
  private h: Float64Array;
  private nk: Float64Array;
  /** Each compartment's coupling to its parent, per its own area and per its parent's (mS/cm²). */
  private up: Float64Array;
  private down: Float64Array;
  private area: Float64Array;
  private diag: Float64Array;
  private rhs: Float64Array;
  t = 0;

  constructor(
    comps: Compartment[],
    /** Axial resistivity, Ω·cm. */
    ra = 100
  ) {
    this.n = comps.length;
    this.parent = Int32Array.from(comps.map((c) => c.parent));
    this.area = Float64Array.from(comps.map((c) => c.area));
    this.up = new Float64Array(this.n);
    this.down = new Float64Array(this.n);
    const half = (c: Compartment) =>
      (ra * (c.len / 2) * 1e-4) / (Math.PI * (c.diam * 1e-4 * 0.5) ** 2);
    for (let i = 1; i < this.n; i++) {
      const p = comps[i].parent;
      const g = 1 / (half(comps[i]) + half(comps[p])); // siemens
      this.up[i] = (g / comps[i].area) * 1000;
      this.down[i] = (g / comps[p].area) * 1000;
    }
    this.v = new Float64Array(this.n).fill(-65);
    const r = rates(-65);
    this.m = new Float64Array(this.n).fill(r.am / (r.am + r.bm));
    this.h = new Float64Array(this.n).fill(r.ah / (r.ah + r.bh));
    this.nk = new Float64Array(this.n).fill(r.an / (r.an + r.bn));
    this.diag = new Float64Array(this.n);
    this.rhs = new Float64Array(this.n);
  }

  /** One step of `dt` ms, with `nA` of current into the soma. */
  step(dt: number, nA = 0) {
    const { n, v, m, h, nk, up, down, diag, rhs, parent } = this;
    for (let i = 0; i < n; i++) {
      // the gates, by exponential Euler at the present voltage
      const r = rates(v[i]);
      const gate = (x: number, a: number, b: number) => {
        const inf = a / (a + b);
        return inf + (x - inf) * Math.exp(-dt * (a + b));
      };
      m[i] = gate(m[i], r.am, r.bm);
      h[i] = gate(h[i], r.ah, r.bh);
      nk[i] = gate(nk[i], r.an, r.bn);
      // the membrane's conductances, held for the step: the new voltage solved for implicitly
      const gNa = HH.gNa * m[i] ** 3 * h[i];
      const gK = HH.gK * nk[i] ** 4;
      diag[i] = 1 / dt + gNa + gK + HH.gL;
      rhs[i] = v[i] / dt + gNa * HH.eNa + gK * HH.eK + HH.gL * HH.eL;
    }
    rhs[0] += (nA * 1e-3) / this.area[0];
    for (let i = 1; i < n; i++) {
      diag[i] += up[i];
      diag[parent[i]] += down[i];
    }
    // Hines: from the tips in, each compartment folded into its parent ...
    for (let i = n - 1; i > 0; i--) {
      const p = parent[i];
      const k = down[i] / diag[i];
      diag[p] -= k * up[i];
      rhs[p] += k * rhs[i];
    }
    // ... down to the soma, solved; then back out to the tips
    v[0] = rhs[0] / diag[0];
    for (let i = 1; i < n; i++) v[i] = (rhs[i] + up[i] * v[parent[i]]) / diag[i];
    this.t += dt;
  }
}

/**
 * Why simulators step implicitly: the course's dendrite — 20 compartments of
 * 20 µm, 2 µm across, Ra 100 Ω·cm, a passive leak — charged by 0.5 nA into
 * its first compartment. Forward Euler, which steps each compartment from the
 * last voltages alone, against backward Euler, which solves for the new ones
 * together: forward Euler with steps just past its limit, which it works out
 * too; backward Euler with NEURON's usual 0.025 ms. Voltages of the first
 * compartment, mV, over `span` ms.
 */
export function stepping(span = 0.4) {
  const [n, len, diam, ra, gm, nA] = [20, 20, 2, 100, 0.1, 0.5];
  const area = Math.PI * diam * len * 1e-8;
  const half = (ra * (len / 2) * 1e-4) / (Math.PI * (diam * 1e-4 * 0.5) ** 2);
  const ga = (1 / (2 * half) / area) * 1000; // mS/cm², to each neighbour
  const inject = (nA * 1e-3) / area; // µA/cm²
  /** Forward Euler is stable only for steps under 2C / (gm + 4ga): the fastest pattern, alternating along the chain. */
  const limit = 2 / (gm + 4 * ga);
  const flow = (v: number[], i: number) =>
    (i > 0 ? ga * (v[i - 1] - v[i]) : 0) + (i < n - 1 ? ga * (v[i + 1] - v[i]) : 0);
  const forward = (dt: number) => {
    let v = new Array(n).fill(-65);
    const out = [{ t: 0, v: v[0] }];
    for (let k = 1; k * dt <= span + 1e-9; k++) {
      v = v.map((x, i) => x + dt * (flow(v, i) - gm * (x + 65) + (i === 0 ? inject : 0)));
      out.push({ t: k * dt, v: v[0] });
    }
    return out;
  };
  const backward = (dt: number) => {
    const v = new Array(n).fill(-65);
    const out = [{ t: 0, v: v[0] }];
    for (let k = 1; k * dt <= span + 1e-9; k++) {
      // the chain's tridiagonal system, solved by elimination from its far end in
      const diag = v.map((_, i) => 1 / dt + gm + (i > 0 ? ga : 0) + (i < n - 1 ? ga : 0));
      const rhs = v.map((x, i) => x / dt + gm * -65 + (i === 0 ? inject : 0));
      for (let i = n - 1; i > 0; i--) {
        const f = ga / diag[i];
        diag[i - 1] -= f * ga;
        rhs[i - 1] += f * rhs[i];
      }
      v[0] = rhs[0] / diag[0];
      for (let i = 1; i < n; i++) v[i] = (rhs[i] + ga * v[i - 1]) / diag[i];
      out.push({ t: k * dt, v: v[0] });
    }
    return out;
  };
  const over = Math.round(limit * 1.15 * 1e4) / 1e4;
  return { limit, over, forward: forward(over), backward: backward(0.025) };
}
