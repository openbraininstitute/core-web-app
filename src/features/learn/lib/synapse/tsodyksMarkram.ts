/**
 * Tsodyks–Markram model of short-term synaptic plasticity, with stochastic
 * (multi-vesicular) release.
 *
 * Deterministic form (Tsodyks & Markram 1997; Markram, Wang & Tsodyks 1998):
 *
 *   between spikes   u(t)  = u · exp(−Δt/τ_facil)
 *                    R(t)  = 1 − (1 − R) · exp(−Δt/τ_rec)
 *   on a spike       u    ← u + U(1 − u)
 *                    amp  ∝ u · R
 *                    R    ← R (1 − u)
 *
 * Stochastic form (Fuhrmann, Segev, Markram & Tsodyks 2002): the terminal has a
 * finite number of independent release sites. `u` is the release probability of
 * each *available* site, a released site becomes unavailable and recovers with
 * rate 1/τ_rec. Averaged over trials this reproduces the deterministic model,
 * but a single trial shows failures and trial-to-trial variability.
 *
 * Units: time ms, conductance nS, voltage mV, capacitance pF, resistance MΩ.
 */

export type SynapseKind = 'excitatory' | 'inhibitory';

export interface TmParams {
  /** Utilisation of synaptic efficacy — release probability increment. */
  U: number;
  /** Recovery from depression (resource replenishment), ms. */
  tauRecMs: number;
  /** Decay of facilitation, ms. */
  tauFacilMs: number;
  /** Independent release sites in the terminal. */
  nSites: number;
  /** Conductance contributed by one vesicle, nS. */
  quantalNs: number;
  /** Post-synaptic conductance decay, ms. */
  tauDecayMs: number;
  /** Synaptic reversal potential, mV. */
  eSynMv: number;
}

export interface Preset {
  id: string;
  label: string;
  kind: SynapseKind;
  /** Holding current applied to the post-synaptic cell, nA. */
  holdNa: number;
  note: string;
  params: TmParams;
}

/**
 * Parameter sets in the spirit of the cortical measurements: depressing and
 * facilitating excitatory connections (Markram, Wang & Tsodyks 1998) and
 * facilitating / depressing inhibitory connections (Gupta, Wang & Markram
 * 2000). Rounded, and paired with a quantal size that gives readable PSPs here.
 */
export const PRESETS: Preset[] = [
  {
    id: 'e-depressing',
    label: 'excitatory · depressing',
    kind: 'excitatory',
    holdNa: 0,
    note: 'pyramid → pyramid: high release probability, slow recovery',
    params: {
      U: 0.5,
      tauRecMs: 670,
      tauFacilMs: 17,
      nSites: 6,
      quantalNs: 0.9,
      tauDecayMs: 2,
      eSynMv: 0,
    },
  },
  {
    id: 'e-facilitating',
    label: 'excitatory · facilitating',
    kind: 'excitatory',
    holdNa: 0,
    note: 'pyramid → interneuron: low release probability, strong facilitation',
    params: {
      U: 0.09,
      tauRecMs: 140,
      tauFacilMs: 670,
      nSites: 6,
      quantalNs: 1.6,
      tauDecayMs: 2,
      eSynMv: 0,
    },
  },
  {
    id: 'i-depressing',
    label: 'inhibitory · depressing',
    kind: 'inhibitory',
    holdNa: 0.12,
    note: 'basket-type interneuron → pyramid',
    params: {
      U: 0.25,
      tauRecMs: 700,
      tauFacilMs: 21,
      nSites: 6,
      quantalNs: 1.6,
      tauDecayMs: 8,
      eSynMv: -80,
    },
  },
  {
    id: 'i-facilitating',
    label: 'inhibitory · facilitating',
    kind: 'inhibitory',
    holdNa: 0.12,
    note: 'Martinotti-type interneuron → pyramid',
    params: {
      U: 0.16,
      tauRecMs: 45,
      tauFacilMs: 376,
      nSites: 6,
      quantalNs: 1.6,
      tauDecayMs: 8,
      eSynMv: -80,
    },
  },
];

export interface ReleaseEvent {
  /** Vesicles released by this spike. */
  released: number;
  /** Sites that were available just before the spike. */
  available: number;
  /** Release probability per available site at this spike. */
  u: number;
  /** Conductance added, nS. */
  ampNs: number;
}

export interface SiteState {
  available: boolean;
  /** Simulated time of the last state change, for animation. */
  changedAt: number;
}

export class TmSynapse {
  /** Facilitation state: release probability of an available site. */
  u = 0;
  /** Post-synaptic conductance, nS. */
  gNs = 0;
  /** Simulated time, ms. */
  t = 0;
  sites: SiteState[] = [];

  constructor(
    public params: TmParams,
    private rnd: () => number = Math.random
  ) {
    this.reset();
  }

  reset() {
    this.u = 0;
    this.gNs = 0;
    this.t = 0;
    this.sites = Array.from({ length: this.params.nSites }, () => ({
      available: true,
      changedAt: 0,
    }));
  }

  /** Resize the terminal, keeping the current availability where possible. */
  setSiteCount(n: number) {
    while (this.sites.length > n) this.sites.pop();
    while (this.sites.length < n) this.sites.push({ available: true, changedAt: this.t });
    this.params = { ...this.params, nSites: n };
  }

  get available(): number {
    let n = 0;
    for (const s of this.sites) if (s.available) n++;
    return n;
  }

  /** Fraction of sites available — the stochastic counterpart of R. */
  get availableFraction(): number {
    return this.sites.length ? this.available / this.sites.length : 0;
  }

  /** Deliver a presynaptic spike. */
  spike(): ReleaseEvent {
    // facilitation: the increment uses the already-decayed u
    this.u = this.u + this.params.U * (1 - this.u);
    const available = this.available;
    let released = 0;
    for (const s of this.sites) {
      if (!s.available) continue;
      if (this.rnd() < this.u) {
        s.available = false;
        s.changedAt = this.t;
        released++;
      }
    }
    const ampNs = released * this.params.quantalNs;
    this.gNs += ampNs;
    return { released, available, u: this.u, ampNs };
  }

  /** Advance facilitation decay, vesicle recovery and conductance decay. */
  step(dtMs: number) {
    this.t += dtMs;
    this.u *= Math.exp(-dtMs / this.params.tauFacilMs);
    this.gNs *= Math.exp(-dtMs / this.params.tauDecayMs);
    const pRecover = 1 - Math.exp(-dtMs / this.params.tauRecMs);
    for (const s of this.sites) {
      if (!s.available && this.rnd() < pRecover) {
        s.available = true;
        s.changedAt = this.t;
      }
    }
  }
}

export interface TmStep {
  u: number;
  R: number;
  /** Amplitude in nS, i.e. nSites · quantal · u · R. */
  ampNs: number;
}

/**
 * Deterministic Tsodyks–Markram amplitudes for a spike train.
 * `intervalsMs[i]` is the interval *before* spike i (the first is ignored).
 */
export function tmDeterministic(p: TmParams, intervalsMs: number[]): TmStep[] {
  let u = 0;
  let R = 1;
  const out: TmStep[] = [];
  intervalsMs.forEach((dt, i) => {
    if (i > 0) {
      u *= Math.exp(-dt / p.tauFacilMs);
      R = 1 - (1 - R) * Math.exp(-dt / p.tauRecMs);
    }
    u = u + p.U * (1 - u);
    const ampNs = p.nSites * p.quantalNs * u * R;
    out.push({ u, R, ampNs });
    R = R * (1 - u);
  });
  return out;
}

/** Evenly spaced train, optionally followed by a delayed recovery test spike. */
export function trainIntervals(nSpikes: number, freqHz: number, recoveryMs?: number): number[] {
  const isi = 1000 / freqHz;
  const out = Array.from({ length: nSpikes }, () => isi);
  if (recoveryMs && recoveryMs > 0) out.push(recoveryMs);
  return out;
}

export interface PassiveSomaCfg {
  vRestMv: number;
  rInMohm: number;
  cPf: number;
}

/** Passive post-synaptic soma driven by a synaptic conductance. */
export class PassiveSoma {
  v: number;

  constructor(public cfg: PassiveSomaCfg) {
    this.v = cfg.vRestMv;
  }

  reset() {
    this.v = this.cfg.vRestMv;
  }

  /**
   * One step. `gNs` is the synaptic conductance, `holdNa` a constant injected
   * current (used to depolarise the cell so that inhibition is visible).
   */
  step(dtMs: number, gNs: number, eSynMv: number, holdNa = 0) {
    const { vRestMv, rInMohm, cPf } = this.cfg;
    const iLeak = (this.v - vRestMv) / rInMohm; // nA
    const iSyn = (gNs * (this.v - eSynMv)) / 1000; // nS·mV = pA -> nA
    const dv = ((holdNa - iLeak - iSyn) / cPf) * 1000; // mV/ms
    this.v += dv * dtMs;
  }
}

/** Coefficient of variation of a sample. */
export function cv(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const varr = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (values.length - 1);
  return Math.sqrt(varr) / Math.abs(mean);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
