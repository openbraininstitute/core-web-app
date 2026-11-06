/**
 * The numbers the physics course shows, worked out rather than typed in: each
 * ion's equilibrium potential from its concentrations (mammalian, 37 °C); the
 * resting potential its conductances settle at; how few ions a membrane's
 * voltage takes; a patch's charging time; how far a voltage spreads along a
 * dendrite; and a Hodgkin–Huxley spike, simulated.
 */

import {
  capacitance,
  chargeForVoltage,
  chargeFromIons,
  ionCount,
  ionsFromCharge,
  nernst,
  restingPotential,
  tauMs,
  thermalVoltageMv,
  voltageFromChargeMv,
} from '@/features/learn/lib/biophysics/membrane';

/** Concentrations, mM, outside and in. */
export const IONS = {
  K: { z: 1, out: 5, in: 140 },
  Na: { z: 1, out: 145, in: 12 },
  Cl: { z: -1, out: 110, in: 10 },
} as const;
export type Ion = keyof typeof IONS;

/** The thermal voltage kT/e, mV: the energy of an ion's thermal jiggling, per charge, at 37 °C. */
export const KT = thermalVoltageMv(37);

/** Each ion's equilibrium potential, mV. */
export const E: Record<Ion, number> = {
  K: nernst(IONS.K),
  Na: nernst(IONS.Na),
  Cl: nernst(IONS.Cl),
};

/** Relative conductances at rest: potassium's channels the most open. */
export const G_REST: Record<Ion, number> = { K: 1, Na: 0.12, Cl: 0.1 };
export const V_REST = restingPotential(
  (Object.keys(G_REST) as Ion[]).map((ion) => ({ g: G_REST[ion], E: E[ion] }))
);

/** How few ions: the charge that holds −70 mV across 1 µm² of membrane, against the potassium in 1 µm³ inside. */
export const FEW = (() => {
  const farads = capacitance(1e-8); // 1 µm² = 1e-8 cm²
  const ions = ionsFromCharge(chargeForVoltage(70, farads));
  const potassium = ionCount(IONS.K.in, 1e-15); // 1 µm³ = 1e-15 L
  return { ions, potassium, ratio: potassium / ions };
})();

/** A patch: resistance (MΩ), capacitance (pF) and the step of current (nA) it is charged by. */
export const PATCH = { r: 100, c: 200, i: 0.1 };
export const TAU = tauMs(PATCH.r, PATCH.c);
/** Its voltage above rest, mV, `t` ms into a step of current that lasts `dur` ms. */
export function rcVoltage(t: number, dur: number) {
  const top = PATCH.i * PATCH.r;
  if (t <= 0) return 0;
  if (t <= dur) return top * (1 - Math.exp(-t / TAU));
  return top * (1 - Math.exp(-dur / TAU)) * Math.exp(-(t - dur) / TAU);
}

/** A dendrite as a cable: specific membrane resistance (Ω·cm²), axial resistivity (Ω·cm), diameter (µm). */
export const CABLE = { rm: 20000, ri: 150, d: 2 };
/** Its length constant, µm: how far a steady voltage spreads before falling to 37%. */
export const LAMBDA = Math.sqrt((CABLE.rm * CABLE.d * 1e-4) / (4 * CABLE.ri)) * 1e4;

/** Why the fluids stay neutral: the voltage, V, the potassium inside such a dendrite would put across its membrane
 * were none of it matched by negative charge — behind each µm² of membrane, d/4 µm³ of the inside. */
export const UNMATCHED =
  voltageFromChargeMv(
    chargeFromIons(ionCount(IONS.K.in, (CABLE.d / 4) * 1e-15)),
    capacitance(1e-8)
  ) / 1000;

/* Hodgkin–Huxley's 1952 squid axon, at 6.3 °C: mV, ms, mS/cm², µA/cm². */
export const HH = { eNa: 50, eK: -77, eL: -54.387, gNa: 120, gK: 36, gL: 0.3, rest: -65 };
const alphaM = (v: number) =>
  Math.abs(v + 40) < 1e-6 ? 1 : (0.1 * (v + 40)) / (1 - Math.exp(-(v + 40) / 10));
const betaM = (v: number) => 4 * Math.exp(-(v + 65) / 18);
const alphaH = (v: number) => 0.07 * Math.exp(-(v + 65) / 20);
const betaH = (v: number) => 1 / (1 + Math.exp(-(v + 35) / 10));
const alphaN = (v: number) =>
  Math.abs(v + 55) < 1e-6 ? 0.1 : (0.01 * (v + 55)) / (1 - Math.exp(-(v + 55) / 10));
const betaN = (v: number) => 0.125 * Math.exp(-(v + 65) / 80);
/** Each gate's steady state at voltage `v`: how open it would end up, held there. */
export const gateAt = (v: number) => ({
  m: alphaM(v) / (alphaM(v) + betaM(v)),
  h: alphaH(v) / (alphaH(v) + betaH(v)),
  n: alphaN(v) / (alphaN(v) + betaN(v)),
});

/** A spike: 30 ms of the model, kicked by 1 ms of current at 5 ms — sampled every 0.05 ms. */
export const SPIKE = (() => {
  const dt = 0.005;
  const every = 10;
  let v = HH.rest;
  let { m, h, n } = gateAt(v);
  const out = { t: [] as number[], v: [] as number[], gNa: [] as number[], gK: [] as number[] };
  for (let k = 0; k * dt <= 30; k++) {
    const t = k * dt;
    if (k % every === 0) {
      out.t.push(t);
      out.v.push(v);
      out.gNa.push(HH.gNa * m * m * m * h);
      out.gK.push(HH.gK * n * n * n * n);
    }
    const stim = t >= 5 && t < 6 ? 20 : 0;
    const ionic =
      HH.gNa * m * m * m * h * (v - HH.eNa) +
      HH.gK * n * n * n * n * (v - HH.eK) +
      HH.gL * (v - HH.eL);
    // gates by exponential Euler, the voltage by forward Euler: steps far below its stability limit
    const step = (x: number, a: number, b: number) => {
      const inf = a / (a + b);
      return inf + (x - inf) * Math.exp(-dt * (a + b));
    };
    m = step(m, alphaM(v), betaM(v));
    h = step(h, alphaH(v), betaH(v));
    n = step(n, alphaN(v), betaN(v));
    v += dt * (stim - ionic);
  }
  return out;
})();
