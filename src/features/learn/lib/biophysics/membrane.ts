/**
 * Membrane biophysics used by the "charge, voltage and membrane potential"
 * explainers. Everything here is a pure function so it can be unit-tested
 * headlessly (see scripts/basics.ts).
 *
 * Units: concentrations mM, temperature °C, voltage mV, charge C (coulombs),
 * capacitance F, resistance Ω, area cm², volume L.
 */

/** Gas constant, J/(mol·K). */
export const R_GAS = 8.314462618;
/** Faraday constant, C/mol. */
export const F_FARADAY = 96485.332;
/** Elementary charge, C. */
export const E_CHARGE = 1.602176634e-19;
/** Specific membrane capacitance, F/cm². */
export const C_SPECIFIC = 1e-6;

export const kelvin = (tempC: number) => tempC + 273.15;

/** Thermal voltage RT/F in mV (≈25.7 mV at 37 °C). */
export const thermalVoltageMv = (tempC: number) => (R_GAS * kelvin(tempC) * 1000) / F_FARADAY;

export interface IonSpec {
  /** Valence: +1 for K⁺/Na⁺, −1 for Cl⁻, +2 for Ca²⁺. */
  z: number;
  /** Outside concentration, mM. */
  out: number;
  /** Inside concentration, mM. */
  in: number;
}

/**
 * Nernst equilibrium potential in mV: the membrane voltage at which the
 * electrical force on an ion exactly cancels its concentration gradient.
 */
export function nernst(ion: IonSpec, tempC = 37): number {
  if (ion.in <= 0 || ion.out <= 0 || ion.z === 0) return NaN;
  return (thermalVoltageMv(tempC) / ion.z) * Math.log(ion.out / ion.in);
}

export interface Conductance {
  /** Relative conductance (any consistent unit). */
  g: number;
  /** Reversal potential, mV. */
  E: number;
}

/**
 * Chord-conductance (parallel conductance) equation: the membrane potential is
 * the conductance-weighted average of the reversal potentials.
 */
export function restingPotential(channels: Conductance[]): number {
  let num = 0;
  let den = 0;
  for (const c of channels) {
    num += c.g * c.E;
    den += c.g;
  }
  return den > 0 ? num / den : NaN;
}

/** Surface area of a sphere of diameter `diamUm` (µm), in cm². */
export const sphereAreaCm2 = (diamUm: number) => Math.PI * (diamUm * 1e-4) ** 2;

/** Volume of a sphere of diameter `diamUm` (µm), in litres. */
export const sphereVolumeL = (diamUm: number) => (Math.PI / 6) * (diamUm * 1e-4) ** 3 * 1e-3; // cm³ -> L

/** Membrane capacitance of a patch, in farads. */
export const capacitance = (areaCm2: number, cSpecific = C_SPECIFIC) => areaCm2 * cSpecific;

/** Number of elementary charges in a given charge. */
export const ionsFromCharge = (coulombs: number) => coulombs / E_CHARGE;

/** Charge carried by `n` monovalent ions, in coulombs. */
export const chargeFromIons = (n: number, z = 1) => n * z * E_CHARGE;

/** V = Q/C, returned in mV. */
export const voltageFromChargeMv = (coulombs: number, farads: number) =>
  farads > 0 ? (coulombs / farads) * 1000 : NaN;

/** Charge (C) needed to hold `mv` across `farads`. */
export const chargeForVoltage = (mv: number, farads: number) => (mv / 1000) * farads;

/** Number of ions dissolved in `volumeL` at `concMM` millimolar. */
export const ionCount = (concMM: number, volumeL: number) =>
  concMM * 1e-3 * volumeL * 6.02214076e23;

/**
 * Voltage of a passive RC patch during a current step, relative to rest.
 *   V(t) = I·R·(1 − e^(−t/RC))
 * `iNa` in nA, `rMohm` in MΩ, `cPf` in pF, `tMs` in ms; result in mV.
 */
export function rcStepMv(tMs: number, iNa: number, rMohm: number, cPf: number): number {
  const tauMs = rMohm * cPf * 1e-3; // MΩ·pF = µs
  if (tMs <= 0) return 0;
  return iNa * rMohm * (1 - Math.exp(-tMs / tauMs));
}

/** Membrane time constant τ = R·C in ms, for R in MΩ and C in pF. */
export const tauMs = (rMohm: number, cPf: number) => rMohm * cPf * 1e-3;
