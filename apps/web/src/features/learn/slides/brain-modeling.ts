import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/** The brain-modeling path: brains, their cells and kinds of neuron, how neurons communicate and learn — and, close in on a dendrite, the voltage across its membrane and how a synapse changes it. */
export const BRAIN_MODELING_SLIDES: Slide[] = [
  {
    say: 'Brains come in different shapes and sizes',
    widget: 'brain',
  },
  {
    say: 'Brains are composed of biological cells',
    widget: 'cells',
  },
  {
    say: 'Neurons are the most important type of brain cell',
    widget: 'neurons',
  },
  {
    say: 'There are many different types of neuron with different shapes, genetics and electrical properties',
    widget: 'gallery',
  },
  {
    say: 'Different neuron types exist in different brain regions',
    widget: 'atlas',
  },
  {
    say: 'Each brain region has a specialized function and contains multiple different neuron types',
    widget: 'area',
  },
  {
    say: 'Neurons communicate with each other within and across brain regions by sending electrical pulses',
    widget: 'talk',
  },
  {
    say: 'This communication between neurons is used to process sensory information and produce intelligent behaviour',
    widget: 'mouse',
  },
  {
    say: 'Over time, neurons and their connections change to adapt to new experiences',
    widget: 'learn',
  },
  {
    say: 'This allows the animal to learn new behaviours, create memories and adapt to its environment',
    widget: 'seek',
  },
  {
    say: 'Understanding how the brain produces intelligent behaviour through neuronal communication and learning is a major goal of neuroscience',
    widget: 'seek',
  },
  {
    say: 'As well as understanding how neuronal communication and learning are affected in disease, and how this could be treated',
    widget: 'disease',
  },
  {
    say: 'So first, let’s learn how neurons communicate',
    widget: 'whole',
  },
  {
    say: "Let's understand the three major parts of a neuron",
    widget: 'whole',
  },
  {
    say: 'The dendrites are where neurons receive signals from other neurons',
    widget: 'dendrites',
  },
  {
    say: 'The soma is where neurons integrate signals from other neurons and decide whether to send signals to other neurons, in turn',
    widget: 'soma',
  },
  {
    say: 'The axon sends signals to other neurons',
    widget: 'axon',
  },
  {
    say: 'To understand how signals flow through a neuron, let’s look at the neuron in 2D',
    widget: 'dendrogram',
  },
  {
    say: "Let's zoom in and build up our understanding step-by-step",
    widget: 'closer',
  },
  {
    say: 'Neurons have a cell membrane made of "lipids" (i.e. fat molecules)',
    widget: 'lipids',
  },
  {
    say: 'The cell membrane separates the inside of the neuron from the outside "extracellular" space',
    widget: 'membrane',
  },
  {
    say: 'Positive and negative ions exist both inside and outside the cell',
    widget: 'charges',
  },
  {
    say: 'When a neuron is at rest, there is a small charge imbalance: slightly more negative charge inside the cell than outside',
    widget: 'imbalance',
  },
  {
    say: 'The difference in charge on either side of the membrane leads to a measurable voltage at each location',
    widget: 'voltage',
  },
  {
    say: 'Connections from other neurons, called synapses, let current in when the presynaptic neuron sends a signal, increasing the voltage',
    widget: 'synapse',
  },
  {
    say: 'This charge then spreads along the dendrite, and the voltage spreads with it',
    widget: 'spread',
  },
  {
    say: 'Neurons process inputs from other neurons and in turn transmit signals to other neurons.',
    note: 'This communication between neurons underlies all brain functions.',
    widget: 'signals',
  },
];
