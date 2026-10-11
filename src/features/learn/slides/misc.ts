import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * Slides that used to end the brain-modeling path, kept together as a course of
 * their own: synapses, the neuron and its inputs, the axon initial segment, and
 * the membrane's voltage — from separated charge up to the spike.
 */
export const MISC_SLIDES: Slide[] = [
  {
    say: 'The connections between neurons are called synapses.',
    note: 'Over time, synapses change their strength, which is crucial for learning and memory.',
  },
  {
    say: 'So let’s start with the fundamental building block of the brain: the neuron.',
    note: 'As we said, there are many types — in different parts of the brain and across species — differing in shape and in their genetic, molecular and electrical properties.',
    widget: 'morphology',
  },
  {
    say: 'Neurons receive signals from other neurons, either exciting them or inhibiting them.',
    note: 'If a neuron is excited enough it spikes, sending a signal of its own — excitatory or inhibitory — on to other neurons.',
    widget: 'excitation',
  },
  {
    say: 'So let’s model that process where it matters most for communication.',
    note: 'The axon initial segment: the piece of membrane just past the soma where the spike is triggered and sent on.',
    widget: 'ais',
  },
  {
    say: 'Every pulse starts with something much simpler.',
    note: 'A voltage across a sheet of fat two molecules thick, maintained by a handful of ions.',
  },
  {
    say: 'Voltage is separated charge.',
    note: 'Move a few million ions across the membrane and tens of millivolts appear. V = Q / C.',
    widget: 'charge',
  },
  {
    say: 'Every ion has a voltage it is aiming for.',
    note: 'Where diffusion down the gradient and the electrical pull back cancel out — the equilibrium potential.',
    widget: 'nernst',
  },
  {
    say: 'Open channels vote on the voltage.',
    note: 'Each one drags the membrane towards its own target, in proportion to how open it is.',
    widget: 'resting',
  },
  {
    say: 'Charging the membrane takes time.',
    note: 'τ = R · C. Sixty-three percent of the way after one time constant.',
    widget: 'rc',
  },
  {
    say: 'Then the channels start opening by themselves.',
    note: 'That is the spike — and once the cell has branches, it travels.',
    cta: { href: '/neuron', label: 'See the spike' },
  },
];
