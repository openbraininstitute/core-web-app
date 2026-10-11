/**
 * Morphology of the toy 2D neuron: 20 compartments laid out in a plane.
 *
 * Coordinates are in "model space" (roughly micrometres) using screen
 * conventions: +x is right, +y is DOWN. The apical dendrites therefore have
 * negative y, the axon positive y.
 *
 *            5     7          apical tuft
 *              4 6
 *                3
 *                2            apical trunk
 *                1
 *   10  9  8     0    11 12 13   soma + basal dendrites
 *                14           axon hillock / initial segment
 *                15
 *                ...
 *                19           axon terminal (output synapse)
 */

export type SectionType = 'soma' | 'apical' | 'basal' | 'axon' | 'terminal';

export interface Compartment {
  /** Index into all state arrays. */
  id: number;
  label: string;
  type: SectionType;
  /** Index of the parent compartment, -1 for the soma (root). */
  parent: number;
  /** Model-space position (µm, y points down). */
  x: number;
  y: number;
  /** Drawing radius in model units. */
  r: number;
  /** Diameter, µm. */
  diam: number;
  /** Length, µm (for the soma: the sphere diameter). */
  len: number;
  /** Membrane area, cm^2. */
  area: number;
  /** Longitudinal (core) resistance of the whole compartment, ohm. */
  rAxial: number;
}

/** Maximal channel conductances in mS/cm^2. */
export interface ChannelSpec {
  gNa: number;
  gK: number;
  gL: number;
}

const UM_TO_CM = 1e-4;

/** Cytoplasmic resistivity, ohm*cm. */
export const RA = 150;

/**
 * Global multiplier on all axial conductances. 1 = the value implied by the
 * geometry above; kept as a knob because this is a teaching model, not a fit.
 */
export const COUPLING_SCALE = 1;

interface Raw {
  label: string;
  type: SectionType;
  parent: number;
  x: number;
  y: number;
  r: number;
  diam: number;
  len: number;
  /** true for the soma, which is treated as a sphere. */
  sphere?: boolean;
}

const raw: Raw[] = [
  // 0 — soma
  { label: 'soma', type: 'soma', parent: -1, x: 0, y: 0, r: 15, diam: 20, len: 20, sphere: true },

  // 1..3 — apical trunk
  { label: 'apical 1', type: 'apical', parent: 0, x: 0, y: -42, r: 6.5, diam: 3, len: 42 },
  { label: 'apical 2', type: 'apical', parent: 1, x: 0, y: -82, r: 5.8, diam: 2.6, len: 40 },
  { label: 'apical 3', type: 'apical', parent: 2, x: 0, y: -120, r: 5.2, diam: 2.2, len: 38 },

  // 4..5 — left apical branch
  { label: 'apical L1', type: 'apical', parent: 3, x: -34, y: -152, r: 4.4, diam: 1.6, len: 46 },
  { label: 'apical L2', type: 'apical', parent: 4, x: -64, y: -184, r: 3.8, diam: 1.2, len: 44 },

  // 6..7 — right apical branch
  { label: 'apical R1', type: 'apical', parent: 3, x: 34, y: -152, r: 4.4, diam: 1.6, len: 46 },
  { label: 'apical R2', type: 'apical', parent: 6, x: 64, y: -184, r: 3.8, diam: 1.2, len: 44 },

  // 8..10 — left basal dendrite
  { label: 'basal L1', type: 'basal', parent: 0, x: -40, y: 24, r: 4.8, diam: 2.2, len: 46 },
  { label: 'basal L2', type: 'basal', parent: 8, x: -76, y: 44, r: 4.2, diam: 1.7, len: 42 },
  { label: 'basal L3', type: 'basal', parent: 9, x: -110, y: 60, r: 3.6, diam: 1.3, len: 38 },

  // 11..13 — right basal dendrite
  { label: 'basal R1', type: 'basal', parent: 0, x: 40, y: 24, r: 4.8, diam: 2.2, len: 46 },
  { label: 'basal R2', type: 'basal', parent: 11, x: 76, y: 44, r: 4.2, diam: 1.7, len: 42 },
  { label: 'basal R3', type: 'basal', parent: 12, x: 110, y: 60, r: 3.6, diam: 1.3, len: 38 },

  // 14..19 — axon, ending in a presynaptic terminal
  { label: 'hillock', type: 'axon', parent: 0, x: 0, y: 34, r: 5, diam: 1.4, len: 30 },
  { label: 'axon 1', type: 'axon', parent: 14, x: 0, y: 70, r: 3.6, diam: 0.9, len: 36 },
  { label: 'axon 2', type: 'axon', parent: 15, x: 0, y: 106, r: 3.6, diam: 0.9, len: 36 },
  { label: 'axon 3', type: 'axon', parent: 16, x: 0, y: 142, r: 3.6, diam: 0.9, len: 36 },
  { label: 'axon 4', type: 'axon', parent: 17, x: 0, y: 178, r: 3.6, diam: 0.9, len: 36 },
  { label: 'terminal', type: 'terminal', parent: 18, x: 0, y: 212, r: 7.5, diam: 2.4, len: 24 },
];

/** Membrane area, cm^2. */
function areaOf(c: Raw): number {
  const d = c.diam * UM_TO_CM;
  const l = c.len * UM_TO_CM;
  return c.sphere ? Math.PI * d * d : Math.PI * d * l;
}

/** Longitudinal resistance of the compartment core, ohm. */
function rAxialOf(c: Raw): number {
  const d = c.diam * UM_TO_CM;
  const l = c.len * UM_TO_CM;
  return (4 * RA * l) / (Math.PI * d * d);
}

export const COMPARTMENTS: Compartment[] = raw.map((c, id) => ({
  id,
  label: c.label,
  type: c.type,
  parent: c.parent,
  x: c.x,
  y: c.y,
  r: c.r,
  diam: c.diam,
  len: c.len,
  area: areaOf(c),
  rAxial: rAxialOf(c),
}));

export const N_COMP = COMPARTMENTS.length; // 20

export const SOMA = 0;
export const TERMINAL = N_COMP - 1;

/**
 * Absolute axial conductance (siemens) between a compartment and its parent:
 * two half-compartment core resistances in series.
 */
export function axialConductance(child: Compartment): number {
  const parent = COMPARTMENTS[child.parent];
  return COUPLING_SCALE / (child.rAxial / 2 + parent.rAxial / 2);
}

/**
 * Channel densities per section. Every compartment carries the classic
 * Hodgkin-Huxley sodium (m^3 h) / delayed-rectifier potassium (n^4) pair plus a
 * leak. The axon initial segment is the most excitable region (as in a real
 * neuron), dendrites are only weakly active so dendritic input must be summed
 * at the soma to fire a spike.
 */
export const CHANNELS: Record<SectionType, ChannelSpec> = {
  soma: { gNa: 260, gK: 60, gL: 0.4 },
  apical: { gNa: 10, gK: 8, gL: 0.12 },
  basal: { gNa: 10, gK: 8, gL: 0.12 },
  axon: { gNa: 320, gK: 80, gL: 0.4 },
  terminal: { gNa: 260, gK: 70, gL: 0.4 },
};

/**
 * Per-compartment tweaks. The axon initial segment (compartment 14) has the
 * highest sodium density in the cell, which is what makes it the spike
 * initiation zone: depolarisation spreading from the soma trips the hillock
 * first and the action potential then travels away from it down the axon.
 */
export const CHANNEL_OVERRIDES: Record<number, Partial<ChannelSpec>> = {
  14: { gNa: 900, gK: 150 },
};

/** Effective channel densities for a compartment. */
export function channelsFor(id: number): ChannelSpec {
  const base = CHANNELS[COMPARTMENTS[id].type];
  const over = CHANNEL_OVERRIDES[id];
  return over ? { ...base, ...over } : base;
}

/** Per-section colour used for traces and labels. */
export const SECTION_COLOR: Record<SectionType, string> = {
  soma: '#f8fafc',
  apical: '#7dd3fc',
  basal: '#c4b5fd',
  axon: '#fbbf24',
  terminal: '#f472b6',
};

export interface ElectrodeDef {
  id: string;
  /** Compartment the pipette is sealed onto. */
  comp: number;
  label: string;
  /** Default injected amplitude, nA. */
  defaultAmp: number;
  /** Direction the pipette points away from the compartment (model space). */
  dir: [number, number];
  /** Keyboard shortcut that fires this electrode. */
  key: string;
}

export const ELECTRODES: ElectrodeDef[] = [
  { id: 'E1', comp: SOMA, label: 'soma', defaultAmp: 0.3, dir: [-1, -0.28], key: '1' },
  { id: 'E2', comp: 5, label: 'apical L tip', defaultAmp: 0.25, dir: [-0.95, -0.32], key: '2' },
  { id: 'E3', comp: 7, label: 'apical R tip', defaultAmp: 0.25, dir: [0.95, -0.32], key: '3' },
  { id: 'E4', comp: 10, label: 'basal L tip', defaultAmp: 0.25, dir: [-0.86, 0.5], key: '4' },
  { id: 'E5', comp: 13, label: 'basal R tip', defaultAmp: 0.25, dir: [0.86, 0.5], key: '5' },
];

/** Slider range for the electrode amplitude, nA. */
export const AMP_MIN = -0.5;
export const AMP_MAX = 2;

/** Post-synaptic partners that receive the axonal output spike. */
export interface TargetDef {
  id: string;
  x: number;
  y: number;
  /** Axonal + synaptic delay in ms. */
  delay: number;
  /** Control point of the quadratic curve from the terminal. */
  cx: number;
  cy: number;
}

export const TARGETS: TargetDef[] = [
  { id: 'post 1', x: 176, y: 148, delay: 1.1, cx: 96, cy: 168 },
  { id: 'post 2', x: 208, y: 222, delay: 1.7, cx: 108, cy: 226 },
  { id: 'post 3', x: 176, y: 296, delay: 2.4, cx: 96, cy: 282 },
];

/**
 * Model-space viewport. Wide enough to contain the cell, the pipette
 * connectors with their labels, and the post-synaptic partners.
 */
export const VIEW = { x0: -248, y0: -252, x1: 284, y1: 342 };
