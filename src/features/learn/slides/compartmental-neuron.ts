import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * A neuron explorer, as slides: a 20-compartment neuron with Hodgkin–Huxley
 * channels, the same widget on every slide, each slide a thing to try with it.
 */
export const COMPARTMENTAL_NEURON_SLIDES: Slide[] = [
  {
    say: 'A neuron in 20 compartments',
    note: 'Dendrites, soma, axon and a terminal, each with Hodgkin–Huxley Na⁺, K⁺ and leak currents, coupled through the cytoplasm. Inject current with a pipette and watch it spread; a spike is relayed to three other neurons.',
    widget: 'neuron',
  },
  {
    say: 'Fire the cell',
    note: 'Click the soma pipette (E1), or press 1. About 0.16 nA for 2 ms is threshold: below it, a passive bump; above it, a full action potential, overshooting to about +40 mV.',
    widget: 'neuron',
  },
  {
    say: 'Watch where the spike starts',
    note: 'Not in the soma: the axon initial segment carries the most Na⁺ channels, so it crosses threshold first, and the spike sweeps to the terminal in about 0.4 ms.',
    widget: 'neuron',
  },
  {
    say: 'Dendrites attenuate',
    note: 'Inject at a dendritic tip (E2–E5): large there, but strongly filtered by the time it reaches the soma. Two tips together sum, and can fire the cell where one cannot.',
    widget: 'neuron',
  },
  {
    say: 'Break the channels',
    note: 'Block Na⁺ fully, as TTX does: current still charges the membrane, but there is no spike. Block K⁺ instead and the spike becomes long and slow to repolarise.',
    widget: 'neuron',
  },
];
