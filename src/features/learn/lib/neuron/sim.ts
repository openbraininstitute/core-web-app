/**
 * Multi-compartment Hodgkin-Huxley neuron.
 *
 * Each compartment obeys
 *
 *   Cm dV/dt = -(I_Na + I_K + I_leak) + sum_j g_ij (V_j - V_i) + I_inj / area
 *
 * with the classic 1952 squid-axon kinetics for the sodium (m^3 h) and
 * delayed-rectifier potassium (n^4) conductances. Voltages are in mV, time in
 * ms, current densities in µA/cm^2, conductances in mS/cm^2, Cm in µF/cm^2.
 *
 * Gating variables use exponential Euler (unconditionally stable), the voltage
 * uses forward Euler with dt = 5 µs which is comfortably below the stability
 * limit 2*Cm/g_total for the conductances used here.
 */

import { axialConductance, COMPARTMENTS, channelsFor, N_COMP, SOMA, TERMINAL } from './morphology';

export const E_NA = 50;
export const E_K = -77;
export const E_L = -54.387;
export const C_M = 1.0;
export const V_REST = -65;

/** Voltage the widget treats as "the cell fired". */
export const SPIKE_THRESHOLD = 0;

// --- HH rate functions (1/ms), with the removable singularities handled. ---

const alphaM = (v: number) => {
  const x = v + 40;
  return Math.abs(x) < 1e-6 ? 1.0 : (0.1 * x) / (1 - Math.exp(-x / 10));
};
const betaM = (v: number) => 4 * Math.exp(-(v + 65) / 18);
const alphaH = (v: number) => 0.07 * Math.exp(-(v + 65) / 20);
const betaH = (v: number) => 1 / (1 + Math.exp(-(v + 35) / 10));
const alphaN = (v: number) => {
  const x = v + 55;
  return Math.abs(x) < 1e-6 ? 0.1 : (0.01 * x) / (1 - Math.exp(-x / 10));
};
const betaN = (v: number) => 0.125 * Math.exp(-(v + 65) / 80);

export type SpikeSource = 'soma' | 'terminal';

export interface SpikeEvent {
  t: number;
  source: SpikeSource;
}

export interface StimEvent {
  t: number;
  comp: number;
  amp: number;
}

const MAX_EVENTS = 400;

export class NeuronSim {
  /** Integration step, ms. Well below the forward-Euler stability limit
   * 2*Cm/g_total for the largest conductance sum in the model (~400 mS/cm^2). */
  readonly dt = 0.0025;
  /** Simulated time, ms. */
  t = 0;

  readonly v = new Float32Array(N_COMP);
  private readonly m = new Float32Array(N_COMP);
  private readonly h = new Float32Array(N_COMP);
  private readonly n = new Float32Array(N_COMP);
  private readonly dv = new Float32Array(N_COMP);

  /** Sustained ("holding") current per compartment, nA. */
  readonly hold = new Float32Array(N_COMP);
  /** Amplitude of a transient pulse per compartment, nA. */
  private readonly pulseAmp = new Float32Array(N_COMP);
  /** Simulated time at which that pulse ends, ms. */
  private readonly pulseEnd = new Float32Array(N_COMP);

  /** Fraction of Na (TTX) and K (TEA) conductance blocked, 0..1. */
  naBlock = 0;
  kBlock = 0;

  // Per-compartment cached constants.
  private readonly gNa = new Float32Array(N_COMP);
  private readonly gK = new Float32Array(N_COMP);
  private readonly gL = new Float32Array(N_COMP);
  /** nA -> µA/cm^2 conversion per compartment. */
  private readonly injScale = new Float32Array(N_COMP);
  /** Flattened neighbour list with the coupling conductance. */
  private readonly nbStart: number[] = [];
  private readonly nbEnd: number[] = [];
  private readonly nbIdx: number[] = [];
  private readonly nbG: number[] = [];

  // --- Rolling voltage traces (ring buffers) ---
  readonly traceLen = 6000;
  /** Record every `traceStride` steps => 0.01 ms resolution. */
  readonly traceStride = 4;
  readonly traceT = new Float32Array(this.traceLen);
  readonly traceV: Float32Array[] = [];
  /** Next index to write. */
  traceHead = 0;
  /** Number of valid samples (<= traceLen). */
  traceCount = 0;
  private stepsSinceSample = 0;

  spikes: SpikeEvent[] = [];
  stims: StimEvent[] = [];
  somaSpikeCount = 0;
  outputSpikeCount = 0;

  constructor() {
    for (const c of COMPARTMENTS) {
      const ch = channelsFor(c.id);
      this.gNa[c.id] = ch.gNa;
      this.gK[c.id] = ch.gK;
      this.gL[c.id] = ch.gL;
      this.injScale[c.id] = 1e-3 / c.area; // nA -> µA, then / cm^2
      this.traceV.push(new Float32Array(this.traceLen));
    }

    // Build a directed adjacency list. The axial conductance between two
    // compartments is absolute (siemens); each compartment feels it divided by
    // its OWN membrane area, so a thin dendrite is dominated by its thick
    // neighbour and not the other way round.
    const nb: { j: number; g: number }[][] = COMPARTMENTS.map(() => []);
    for (const c of COMPARTMENTS) {
      if (c.parent < 0) continue;
      const G = axialConductance(c); // S
      const p = COMPARTMENTS[c.parent];
      nb[c.id].push({ j: c.parent, g: (G * 1e3) / c.area }); // mS/cm^2
      nb[c.parent].push({ j: c.id, g: (G * 1e3) / p.area });
    }
    for (let i = 0; i < N_COMP; i++) {
      this.nbStart[i] = this.nbIdx.length;
      for (const e of nb[i]) {
        this.nbIdx.push(e.j);
        this.nbG.push(e.g);
      }
      this.nbEnd[i] = this.nbIdx.length;
    }

    this.reset();
  }

  /** Return every compartment to the resting state and clear all history. */
  reset() {
    this.t = 0;
    for (let i = 0; i < N_COMP; i++) {
      this.v[i] = V_REST;
      this.m[i] = alphaM(V_REST) / (alphaM(V_REST) + betaM(V_REST));
      this.h[i] = alphaH(V_REST) / (alphaH(V_REST) + betaH(V_REST));
      this.n[i] = alphaN(V_REST) / (alphaN(V_REST) + betaN(V_REST));
      this.pulseAmp[i] = 0;
      this.pulseEnd[i] = 0;
    }
    this.traceHead = 0;
    this.traceCount = 0;
    this.stepsSinceSample = 0;
    this.spikes = [];
    this.stims = [];
    this.somaSpikeCount = 0;
    this.outputSpikeCount = 0;
    this.sample();
  }

  /** Inject `amp` nA into `comp` for `dur` ms starting now. */
  pulse(comp: number, amp: number, dur: number) {
    this.pulseAmp[comp] = amp;
    this.pulseEnd[comp] = this.t + dur;
    this.stims.push({ t: this.t, comp, amp });
    if (this.stims.length > MAX_EVENTS) this.stims.shift();
  }

  setHold(comp: number, amp: number) {
    this.hold[comp] = amp;
  }

  /** Total current currently entering a compartment, nA (for the UI). */
  currentAt(comp: number) {
    const pulse = this.t < this.pulseEnd[comp] ? this.pulseAmp[comp] : 0;
    return this.hold[comp] + pulse;
  }

  /** Advance the model by `ms` of simulated time. Returns new spike events. */
  advance(ms: number): SpikeEvent[] {
    const steps = Math.max(0, Math.round(ms / this.dt));
    const fresh: SpikeEvent[] = [];
    for (let s = 0; s < steps; s++) this.step(fresh);
    return fresh;
  }

  private step(fresh: SpikeEvent[]) {
    const { dt, v, m, h, n, dv } = this;
    const naScale = 1 - this.naBlock;
    const kScale = 1 - this.kBlock;
    const vSomaPrev = v[SOMA];
    const vTermPrev = v[TERMINAL];

    for (let i = 0; i < N_COMP; i++) {
      const vi = v[i];

      // Gating variables, exponential Euler.
      const am = alphaM(vi);
      const bm = betaM(vi);
      const ah = alphaH(vi);
      const bh = betaH(vi);
      const an = alphaN(vi);
      const bn = betaN(vi);
      const sm = am + bm;
      const sh = ah + bh;
      const sn = an + bn;
      const mNew = am / sm + (m[i] - am / sm) * Math.exp(-dt * sm);
      const hNew = ah / sh + (h[i] - ah / sh) * Math.exp(-dt * sh);
      const nNew = an / sn + (n[i] - an / sn) * Math.exp(-dt * sn);

      // Ionic currents (µA/cm^2), evaluated with the updated gates.
      const gNa = this.gNa[i] * naScale * mNew * mNew * mNew * hNew;
      const nn = nNew * nNew;
      const gK = this.gK[i] * kScale * nn * nn;
      let iIon = gNa * (vi - E_NA) + gK * (vi - E_K) + this.gL[i] * (vi - E_L);

      // Axial current from the neighbouring compartments.
      let iAx = 0;
      for (let k = this.nbStart[i]; k < this.nbEnd[i]; k++) {
        iAx += this.nbG[k] * (v[this.nbIdx[k]] - vi);
      }

      // Electrode current.
      let inj = this.hold[i];
      if (this.t < this.pulseEnd[i]) inj += this.pulseAmp[i];
      iIon -= inj * this.injScale[i];

      dv[i] = (-iIon + iAx) / C_M;
      m[i] = mNew;
      h[i] = hNew;
      n[i] = nNew;
    }

    for (let i = 0; i < N_COMP; i++) v[i] += dt * dv[i];
    this.t += dt;

    // Rising-edge spike detection at the soma and at the output terminal.
    if (vSomaPrev < SPIKE_THRESHOLD && v[SOMA] >= SPIKE_THRESHOLD) {
      this.push({ t: this.t, source: 'soma' }, fresh);
      this.somaSpikeCount++;
    }
    if (vTermPrev < SPIKE_THRESHOLD && v[TERMINAL] >= SPIKE_THRESHOLD) {
      this.push({ t: this.t, source: 'terminal' }, fresh);
      this.outputSpikeCount++;
    }

    if (++this.stepsSinceSample >= this.traceStride) {
      this.stepsSinceSample = 0;
      this.sample();
    }
  }

  private push(e: SpikeEvent, fresh: SpikeEvent[]) {
    this.spikes.push(e);
    if (this.spikes.length > MAX_EVENTS) this.spikes.shift();
    fresh.push(e);
  }

  private sample() {
    const i = this.traceHead;
    this.traceT[i] = this.t;
    for (let c = 0; c < N_COMP; c++) this.traceV[c][i] = this.v[c];
    this.traceHead = (i + 1) % this.traceLen;
    if (this.traceCount < this.traceLen) this.traceCount++;
  }

  /** Oldest-to-newest index of sample `k` (0 <= k < traceCount). */
  traceIndex(k: number) {
    const start = (this.traceHead - this.traceCount + this.traceLen) % this.traceLen;
    return (start + k) % this.traceLen;
  }

  /** Firing rate estimated from the most recent somatic inter-spike interval. */
  lastRateHz() {
    const somaSpikes = this.spikes.filter((s) => s.source === 'soma');
    if (somaSpikes.length < 2) return 0;
    const a = somaSpikes[somaSpikes.length - 2].t;
    const b = somaSpikes[somaSpikes.length - 1].t;
    const isi = b - a;
    return isi > 0 ? 1000 / isi : 0;
  }
}
