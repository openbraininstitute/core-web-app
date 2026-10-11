import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The learn app's basics page, as slides: one soma, treated as electrically uniform, and four
 * ideas, each with its widget. Charge, the gradients that move it, the channels that weigh them,
 * and the time the membrane takes to charge.
 */
export const MEMBRANE_BASICS_SLIDES: Slide[] = [
  {
    say: 'Voltage is separated charge',
    note: 'The membrane is a thin insulator with salt water on both sides: a capacitor. Moving a little charge across it makes a voltage, V = Q/C. Drag the slider: a few million K⁺ ions leaving makes tens of millivolts, while the bulk solution stays neutral.',
    widget: 'charge',
  },
  {
    say: 'Gradients set a target voltage for each ion',
    note: 'An ion diffusing down its gradient carries charge, building a voltage that opposes it. Where the two balance is that ion’s equilibrium (Nernst) potential: about −90 mV for K⁺, +65 mV for Na⁺. Only the ratio of concentrations matters.',
    widget: 'nernst',
  },
  {
    say: 'Open channels vote on the membrane potential',
    note: 'Each open channel type pulls the voltage towards its own equilibrium potential, weighted by how open it is: Vm = Σ gᵢEᵢ / Σ gᵢ. At rest the soma is mostly permeable to K⁺, so it sits near E_K.',
    widget: 'resting',
  },
  {
    say: 'Charging the membrane takes time',
    note: 'A capacitor in parallel with a resistance charges along an exponential, with τ = R·C, and settles at I·R. A bigger soma charges more slowly; a higher resistance gives a larger deflection.',
    widget: 'rc',
  },
];
