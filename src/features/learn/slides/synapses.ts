import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * Synapses, split out of the electrical physics of a neuron to be finished on their own: a signal arriving from
 * another neuron, the chemical synapse between them, the transmitter released and bound, the receptors' channels
 * opening, AMPA receptors and their reversal potential, and how fast it all happens. Drawn by the same figure.
 */
export const SYNAPSES_SLIDES: Slide[] = [
  {
    say: 'We can now consider what happens when a signal arrives from another neuron',
    widget: 'physics2:signal',
  },
  {
    say: 'Two neurons can be connected via a chemical synapse',
    widget: 'physics2:synapse',
  },
  {
    say: 'When a signal arrives at the presynaptic terminal, chemical molecules (called neurotransmitters) are released',
    widget: 'physics2:release',
  },
  {
    say: 'These bind to receptors in the postsynaptic neuron',
    widget: 'physics2:bind',
  },
  {
    say: 'These receptors contain ion channels which open when the neurotransmitter binds to them',
    widget: 'physics2:opening',
  },
  {
    say: 'These ion channels are selective for certain types of ion',
    widget: 'physics2:inflow',
  },
  {
    say: 'One example is the AMPA receptor which is activated when the neurotransmitter ‘glutamate’ is released',
    widget: 'physics2:glutamate',
  },
  {
    say: 'AMPA receptors are selective for both Na⁺ and K⁺, and act similarly to the passive ion channels we saw earlier once activated, allowing sodium to flow in and potassium to flow out with similar permeability',
    widget: 'physics2:ampa',
  },
  {
    say: 'Na⁺ wants to flow in (toward +60 mV) and K⁺ wants to flow out (toward −90 mV).\n\nThe reversal potential is where these two currents cancel. With roughly equal permeability, that’s a voltage between the two, close to 0 mV',
    widget: 'physics2:cancel',
  },
  {
    say: 'Glutamate is cleared quickly. After release, glutamate diffuses out of the cleft and is taken up by transporters within about 1 ms',
    widget: 'physics2:clearance',
  },
  {
    say: 'After glutamate unbinds, the channel takes time to shut, a process called deactivation. Some channels also enter a closed, glutamate-bound state, called desensitization. The AMPA current (EPSC) typically decays with a time constant of about 1–5 ms',
    widget: 'physics2:unbind',
  },
  {
    say: 'Fast unbinding (deactivation): once glutamate drops, it comes off the receptor quickly and the channel closes, over about 1 to 3 ms',
    widget: 'physics2:deactivation',
  },
  {
    say: 'Desensitization: if glutamate lingers, AMPA receptors close anyway within a few to about 10 ms, and stay unresponsive for a while',
    widget: 'physics2:desensitize',
  },
  {
    say: 'Synapse type: some auditory brainstem synapses, built for precise timing, have decays under 1 ms. Many cortical and hippocampal synapses are around 2 to 5 ms',
    note: 'Subunits and auxiliary proteins (such as TARPs) change opening and desensitization rates. Temperature: everything is faster at body temperature than in many room-temperature lab recordings',
    widget: 'physics2:factors',
  },
  {
    say: 'Charging the capacitance takes time, so the voltage doesn’t follow the brief AMPA current instantly. The membrane time constant τ = rₘ × cₘ sets how fast the voltage rises and decays, typically about 10 to 30 ms',
    widget: 'physics2:tau',
  },
];
