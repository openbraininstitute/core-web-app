/**
 * Calcium-based long-term plasticity, in the spirit of Chindemi et al.,
 * "A calcium-based plasticity model for predicting long-term potentiation and
 * depression in the neocortex" (Nature Communications, 2022), which builds on
 * the bistable calcium model of Graupner & Brunel (2012).
 *
 * What is kept
 * ------------
 * • A post-synaptic calcium trace fed by two sources: glutamate release from the
 *   presynaptic terminal (NMDA-receptor influx, delayed) and the post-synaptic
 *   action potential (voltage-dependent calcium channels).
 * • Two thresholds: calcium above θ_d drives depression, above θ_p drives
 *   potentiation, so the *same* trace can do either depending on how much
 *   calcium accumulates.
 * • A bistable synaptic efficacy ρ with attractors at 0 (depressed) and 1
 *   (potentiated), which is what makes the outcome persist after the protocol.
 * • Dependence on extracellular calcium: [Ca²⁺]_o sets release probability
 *   through a Hill function (n = 4, K = 2.79 mM, as used for the in-silico
 *   cortical circuits) and scales the calcium influx per event. This is the
 *   knob that makes in-vitro (2 mM) and in-vivo-like (1.2 mM) conditions give
 *   different answers to the same protocol.
 *
 * What is simplified
 * ------------------
 * The real model integrates NMDA and VDCC currents in a morphologically
 * detailed spine, with voltage-dependent NMDA conductance and per-synapse
 * calibration. Here the influx per event is a fixed amount scaled by [Ca²⁺]_o,
 * and ρ maps linearly onto synaptic efficacy. The plasticity time constant is
 * the slow one (tens of seconds), so a consolidation period is simulated after
 * the protocol to show which attractor the synapse settles into.
 *
 * Units: ms, mM, calcium in the arbitrary units of the threshold (θ_d, θ_p).
 */

export interface CaPlasticityParams {
  /** Calcium decay time constant, ms. */
  tauCaMs: number;
  /** Calcium per released vesicle (NMDA), arbitrary units. */
  cPre: number;
  /** Calcium per post-synaptic spike (VDCC). */
  cPost: number;
  /** Delay of the presynaptic contribution, ms. */
  delayPreMs: number;
  /** Depression threshold. */
  thetaD: number;
  /** Potentiation threshold. */
  thetaP: number;
  /** Depression rate. */
  gammaD: number;
  /** Potentiation rate. */
  gammaP: number;
  /** Plasticity time constant, ms (slow: tens of seconds). */
  tauRhoMs: number;
  /** Starting efficacy, 0 = depressed, 1 = potentiated. */
  rho0: number;
  /** Release probability at the reference calcium concentration. */
  uRef: number;
  /** Reference extracellular calcium, mM. */
  caRefMm: number;
  /** Hill parameters for the release-probability dependence on [Ca²⁺]_o. */
  hillK: number;
  hillN: number;
  /** Synaptic efficacy at ρ = 0 and ρ = 1, relative to baseline. */
  wDep: number;
  wPot: number;
}

export const DEFAULT_CA_PARAMS: CaPlasticityParams = {
  tauCaMs: 20,
  cPre: 1.4,
  cPost: 1.0,
  delayPreMs: 13.7,
  thetaD: 0.8,
  thetaP: 1.8,
  gammaD: 100,
  gammaP: 1200,
  tauRhoMs: 75_000,
  rho0: 0.5,
  uRef: 0.5,
  caRefMm: 2,
  hillK: 2.79,
  hillN: 4,
  wDep: 0.5,
  wPot: 2,
};

/** In-vitro slice versus in-vivo-like extracellular calcium. */
export const CA_CONDITIONS = [
  { id: 'invivo', label: 'in vivo-like', caMm: 1.2, note: 'cortex in the intact brain' },
  { id: 'invitro', label: 'in vitro', caMm: 2.0, note: 'standard slice recording' },
] as const;

const hill = (ca: number, k: number, n: number) => ca ** n / (k ** n + ca ** n);

/**
 * Release probability at a given extracellular calcium concentration, scaled so
 * that it equals `uRef` at the reference concentration.
 */
export function releaseProbability(caMm: number, p: CaPlasticityParams): number {
  const ratio = hill(caMm, p.hillK, p.hillN) / hill(p.caRefMm, p.hillK, p.hillN);
  return Math.max(0, Math.min(1, p.uRef * ratio));
}

/** Calcium influx per event, relative to the reference concentration. */
export function influxScale(caMm: number, p: CaPlasticityParams): number {
  return caMm / p.caRefMm;
}

/** Synaptic efficacy (relative to baseline) for a given ρ. */
export const efficacy = (rho: number, p: CaPlasticityParams) => p.wDep + rho * (p.wPot - p.wDep);

export interface ProtocolCfg {
  /** t_post − t_pre in ms. Positive = presynaptic spike first. */
  dtPairMs: number;
  nPairings: number;
  freqHz: number;
  caMm: number;
  /** Seed for the release lottery — release is always stochastic. */
  seed?: number;
  /**
   * Consolidation time simulated after the protocol, ms. Set to 0 to skip the
   * trace and use the analytic attractor (which is exact without noise).
   */
  relaxMs?: number;
}

export interface ProtocolResult {
  /** Sampled every ms during the protocol. */
  t: Float32Array;
  ca: Float32Array;
  rho: Float32Array;
  preTimes: number[];
  postTimes: number[];
  /** Presynaptic spikes that actually released (stochastic mode). */
  releasedAt: number[];
  protocolMs: number;
  releaseProb: number;
  peakCa: number;
  /** Total time spent in each band, ms. */
  msAboveD: number;
  msAboveP: number;
  rhoAfterProtocol: number;
  /** ρ after the slow bistable dynamics have settled. */
  rhoFinal: number;
  /** Trajectory of ρ during consolidation, sampled every 500 ms. */
  relaxRho: Float32Array;
  relaxMs: number;
}

const DT = 0.5; // ms

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** dρ/dt of the bistable efficacy, per ms. */
function rhoRate(rho: number, ca: number, p: CaPlasticityParams): number {
  const bistable = -rho * (1 - rho) * (0.5 - rho);
  const pot = ca >= p.thetaP ? p.gammaP * (1 - rho) : 0;
  const dep = ca >= p.thetaD ? p.gammaD * rho : 0;
  return (bistable + pot - dep) / p.tauRhoMs;
}

/** Where the bistable dynamics take ρ once the calcium is gone. */
export const attractorOf = (rho: number) => (rho > 0.5 ? 1 : rho < 0.5 ? 0 : 0.5);

/** Run a pre/post pairing protocol and let the synapse consolidate. */
export function runProtocol(p: CaPlasticityParams, cfg: ProtocolCfg): ProtocolResult {
  const u = releaseProbability(cfg.caMm, p);
  const scale = influxScale(cfg.caMm, p);
  const isi = 1000 / cfg.freqHz;
  const base = 150 + Math.max(0, -cfg.dtPairMs);
  const rnd = mulberry32(cfg.seed ?? 1);

  const preTimes: number[] = [];
  const postTimes: number[] = [];
  const releasedAt: number[] = [];
  const events: { t: number; amp: number }[] = [];

  for (let i = 0; i < cfg.nPairings; i++) {
    const tPre = base + i * isi;
    const tPost = tPre + cfg.dtPairMs;
    preTimes.push(tPre);
    postTimes.push(tPost);
    // glutamate release — and therefore NMDA calcium — is all or nothing
    if (rnd() < u) {
      events.push({ t: tPre + p.delayPreMs, amp: p.cPre * scale });
      releasedAt.push(tPre);
    }
    events.push({ t: tPost, amp: p.cPost * scale });
  }
  events.sort((a, b) => a.t - b.t);

  const protocolMs =
    base + (cfg.nPairings - 1) * isi + Math.max(200, 4 * p.tauCaMs) + Math.abs(cfg.dtPairMs);
  const samples = Math.floor(protocolMs) + 1;
  const t = new Float32Array(samples);
  const ca = new Float32Array(samples);
  const rho = new Float32Array(samples);

  let c = 0;
  let r = p.rho0;
  let ev = 0;
  let peakCa = 0;
  let msAboveD = 0;
  let msAboveP = 0;
  let sample = 0;
  let nextSampleAt = 0;

  for (let time = 0; time <= protocolMs; time += DT) {
    while (ev < events.length && events[ev].t <= time) {
      c += events[ev].amp;
      ev++;
    }
    if (c > peakCa) peakCa = c;
    if (c >= p.thetaD) msAboveD += DT;
    if (c >= p.thetaP) msAboveP += DT;

    r += rhoRate(r, c, p) * DT;
    r = Math.max(0, Math.min(1, r));
    c *= Math.exp(-DT / p.tauCaMs);

    if (time >= nextSampleAt && sample < samples) {
      t[sample] = time;
      ca[sample] = c;
      rho[sample] = r;
      sample++;
      nextSampleAt += 1;
    }
  }

  const rhoAfterProtocol = r;

  // Consolidation. Without noise the bistable term is deterministic, so the
  // attractor is known; the trace is only computed when it will be drawn.
  const relaxMs = cfg.relaxMs ?? 0;
  const relaxDt = 20;
  const relaxSamples = relaxMs > 0 ? Math.floor(relaxMs / 500) + 1 : 0;
  const relaxRho = new Float32Array(relaxSamples);
  let k = 0;
  let nextRelaxSample = 0;
  for (let time = 0; time <= relaxMs; time += relaxDt) {
    r += rhoRate(r, 0, p) * relaxDt;
    r = Math.max(0, Math.min(1, r));
    if (time >= nextRelaxSample && k < relaxSamples) {
      relaxRho[k++] = r;
      nextRelaxSample += 500;
    }
  }

  return {
    t: t.subarray(0, sample),
    ca: ca.subarray(0, sample),
    rho: rho.subarray(0, sample),
    preTimes,
    postTimes,
    releasedAt,
    protocolMs,
    releaseProb: u,
    peakCa,
    msAboveD,
    msAboveP,
    rhoAfterProtocol,
    rhoFinal: attractorOf(rhoAfterProtocol),
    relaxRho: relaxRho.subarray(0, k),
    relaxMs,
  };
}

export interface AveragedResult {
  meanDRho: number;
  meanRhoAfter: number;
  /** Fraction of trials that end up potentiated. */
  fractionPotentiated: number;
  meanPeakCa: number;
  meanMsAboveD: number;
  meanMsAboveP: number;
  releaseProb: number;
  trials: number;
}

/**
 * Average over independent release lotteries. The thresholds make the model
 * nonlinear, so averaging trials is not the same as using the mean influx —
 * this is the honest way to get the expected plasticity.
 */
export function averageProtocol(
  p: CaPlasticityParams,
  cfg: Omit<ProtocolCfg, 'seed' | 'relaxMs'>,
  trials = 8
): AveragedResult {
  let dRho = 0;
  let rhoAfter = 0;
  let pot = 0;
  let peak = 0;
  let aboveD = 0;
  let aboveP = 0;
  let releaseProb = 0;
  for (let s = 0; s < trials; s++) {
    const res = runProtocol(p, { ...cfg, seed: s * 7919 + 13, relaxMs: 0 });
    dRho += res.rhoAfterProtocol - p.rho0;
    rhoAfter += res.rhoAfterProtocol;
    if (res.rhoFinal > 0.5) pot++;
    peak += res.peakCa;
    aboveD += res.msAboveD;
    aboveP += res.msAboveP;
    releaseProb = res.releaseProb;
  }
  return {
    meanDRho: dRho / trials,
    meanRhoAfter: rhoAfter / trials,
    fractionPotentiated: pot / trials,
    meanPeakCa: peak / trials,
    meanMsAboveD: aboveD / trials,
    meanMsAboveP: aboveP / trials,
    releaseProb,
    trials,
  };
}

export interface StdpPoint {
  dtMs: number;
  /** Mean change in ρ produced by the protocol, before consolidation. */
  dRho: number;
  /** Fraction of trials that consolidate as potentiated. */
  fractionPotentiated: number;
}

/** Expected plasticity as a function of pairing interval, averaged over trials. */
export function stdpCurve(
  p: CaPlasticityParams,
  cfg: Omit<ProtocolCfg, 'dtPairMs' | 'seed' | 'relaxMs'>,
  dts: number[],
  trials = 6
): StdpPoint[] {
  return dts.map((dtMs) => {
    const avg = averageProtocol(p, { ...cfg, dtPairMs: dtMs }, trials);
    return { dtMs, dRho: avg.meanDRho, fractionPotentiated: avg.fractionPotentiated };
  });
}

/** Symmetric list of pairing intervals for the curve. */
export const defaultDts = (max = 100, step = 10) => {
  const out: number[] = [];
  for (let d = -max; d <= max; d += step) out.push(d);
  return out;
};

export type Outcome = 'potentiated' | 'depressed' | 'unchanged';

export function outcomeOf(res: ProtocolResult, p: CaPlasticityParams): Outcome {
  const d = res.rhoAfterProtocol - p.rho0;
  if (Math.abs(d) < 0.01) return 'unchanged';
  return res.rhoFinal > 0.5 ? 'potentiated' : 'depressed';
}
