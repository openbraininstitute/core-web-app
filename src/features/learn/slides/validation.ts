import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * Simulations and validation, after Day 5, Session 1 of the Chinese summer school (from its slide
 * 12 on): large-scale biophysically detailed models and why to build them; how a circuit's
 * activity is validated against real data, from spikes over trials to single neurons, pairs and
 * populations; the recording techniques that provide the data, each with its caveats; why
 * validation is hard; and where models are heading.
 */
export const VALIDATION_SLIDES: Slide[] = [
  {
    say: 'Brain models are built at every scale',
    note: 'From a single neuron with its ion channels, to microcircuits of thousands of neurons, to whole cortical regions and, in progress, the whole brain: general multi-scale models.',
    widget: 'validation:scales',
  },
  {
    say: 'A model of the rat’s non-barrel somatosensory cortex',
    note: 'Millions of neurons placed layer by layer in an atlas, each with a reconstructed morphology, connected synapse by synapse where axons and dendrites meet, then simulated.',
    widget: 'validation:nbs1',
  },
  {
    say: 'Why build large-scale, biophysically detailed models?',
    note: 'Neuroscience has many questions and many problems. A detailed model lets you change any parameter and measure any signal, from every neuron at once.',
    widget: 'validation:why',
  },
  {
    say: 'Such models are used across many topics',
    note: 'Plasticity, spike sorting, cell assemblies, LFP and EEG, the neuro-glia-vasculature, dendritic processing, optogenetics, and the units in which information is represented.',
    widget: 'validation:topics',
  },
  {
    say: 'Validation: comparing a model with experimental observations',
    note: 'Run the same analyses on the model’s data and the real data, firing rates, spike timing and correlations, and compare. Some agree, some do not, and the real data can be biased too.',
    widget: 'validation:compare',
  },
  {
    say: 'Some facts go into the model; others are kept to test it',
    note: 'Connectivity can be built in directly. Unknown parameters are optimised to match data. The model is then validated against data it was never fitted to.',
    widget: 'validation:facts',
  },
  {
    say: 'The space of parameters is huge',
    note: 'With ion channels, synapses and connections, the combinations run to 10¹⁵ and beyond: too many to search. So each component must be valid on its own, before the whole circuit is checked.',
    widget: 'validation:space',
  },
  {
    say: 'Data is sparse, so models combine many sources',
    note: 'Rat and mouse; somatosensory, visual and barrel cortex; in vitro, in vivo and electron microscopy. When the Blue Brain Project started in 2005, far less data existed than today.',
    widget: 'validation:sources',
  },
  {
    say: 'Spikes are the neural code',
    note: 'A neuron’s membrane potential is reduced to the times of its spikes, its spike train. Comparing spike trains asks what the rules of communication between neurons are.',
    widget: 'validation:code',
  },
  {
    say: 'The brain is never the same twice, so compare statistically',
    note: 'A neuron fires differently on each repetition of a stimulus. Compare the model’s distribution of firing rates (spikes / time) with the data’s: its mean, its spread and its shape.',
    widget: 'validation:trials',
  },
  {
    say: 'Every mean firing rate matches. Is this a good model?',
    note: 'Not necessarily: many different models match the means. If many models are “valid”, which one is correct?',
    widget: 'validation:means',
  },
  {
    say: 'An extra validation: the time of the first spike',
    note: 'A model can match the rates and still get the timing wrong. Here its first spikes come far too early after the stimulus.',
    widget: 'validation:first',
  },
  {
    say: 'More validations, fewer “valid” models',
    note: 'Each test rules more models out: from all of them, to those with the right mean rates, the right first spikes, and the right rate distributions. The differences show where a model can be improved.',
    widget: 'validation:funnel',
  },
  {
    say: 'Information is encoded, and decoded, in firing rates',
    note: 'A neuron whose rate depends on the stimulus encodes it; a neuron reading that rate decodes it. The less the distributions overlap, the more accurately the stimulus can be decoded.',
    widget: 'validation:decode',
  },
  {
    say: 'Every recording trades spatial against temporal resolution',
    note: 'Fast techniques see spikes millisecond by millisecond but few neurons; others see many neurons averaged together, slowly. Every technique under-samples in some way.',
    widget: 'validation:resolution',
  },
  {
    say: 'Single neurons: rates, first spikes, intervals and timing',
    note: 'A neuron’s firing rate distribution, its first spike times, its inter-spike intervals (bursts show as short ones) and its peri-stimulus time histogram all test a model. How precise are its spike times?',
    widget: 'validation:single',
  },
  {
    say: 'Pairs of neurons: do they fire together?',
    note: 'Correlate two neurons’ rates and first spikes trial by trial, and histogram their spike-time differences, every spike against every spike within 250 ms.',
    widget: 'validation:pairs',
  },
  {
    say: 'Populations: distributions across neurons',
    note: 'Across a population, compare the distributions of mean firing rates, first-spike times and inter-spike intervals, and the population’s peri-stimulus time histogram.',
    widget: 'validation:population',
  },
  {
    say: 'Dimensionality reduction shows a population’s trajectory',
    note: 'Each trial’s, or each time bin’s, rates are a point in a space with one axis per neuron. Principal components reduce it to a few axes, where activity traces out trajectories.',
    widget: 'validation:pca',
  },
  {
    say: 'A model records every neuron; an experiment, only a few',
    note: 'In vivo, the somatic voltage of one or two cells at a time; in the model, every neuron. How neurons respond together, their shared variability, is what single recordings miss.',
    widget: 'validation:shared',
  },
  {
    say: 'Extracellular recording and spike sorting',
    note: 'Electrodes record spikes from the neurons around them; spike sorting assigns them to units. A model gives the ground truth to test sorting against, and to predict its biases.',
    widget: 'validation:extracellular',
  },
  {
    say: 'Calcium imaging: neurons that glow when they spike',
    note: 'An indicator makes neurons emit light as calcium flows in when they spike. It records hundreds of neurons, at scales from dendritic spines to the whole brain, but slowly.',
    widget: 'validation:calcium',
  },
  {
    say: 'Voltage imaging: the membrane potential, optically',
    note: 'A molecule in the membrane brightens and dims with its voltage, at millisecond resolution: spikes and subthreshold fluctuations, in a small field of view.',
    widget: 'validation:voltage',
  },
  {
    say: 'Whole-cell patch: the membrane potential, measured directly',
    note: 'A pipette at the soma records every spike, the true firing rate, and the cell’s resting potential, input resistance, f–I curve and spike shape. But only one or two cells at a time.',
    widget: 'validation:patch',
  },
  {
    say: 'A patch on the dendrite: what the soma never sees',
    note: 'Dendritic spikes that barely register at the soma constrain a model’s dendritic excitability directly. The data is small, and mostly from thick layer 5 apical trunks.',
    widget: 'validation:dendrite',
  },
  {
    say: 'The local field potential: summed synaptic currents',
    note: 'The low-frequency extracellular potential, below 300 Hz. Its spectrum, laminar profile and phase relationships validate a model, though some of it comes from beyond the model’s edges.',
    widget: 'validation:lfp',
  },
  {
    say: 'Current source density: where current enters and leaves',
    note: 'The second spatial derivative of the laminar LFP locates sinks and sources in depth and time, which a model’s laminar connectivity and input timing can be matched against.',
    widget: 'validation:csd',
  },
  {
    say: 'EEG: the whole brain, from the scalp',
    note: 'Non-invasive and available in humans, it links models to clinical and cognitive neuroscience. But it is smoothed by the skull, and many networks could produce the same signal.',
    widget: 'validation:eeg',
  },
  {
    say: 'No single technique constrains a model on its own',
    note: 'They trade off in how many neurons they see, how fast and how finely, and how invasive they are. A model is validated against several at once.',
    widget: 'validation:techniques',
  },
  {
    say: 'Why is validation difficult?',
    note: 'Data from different species and regions, in different formats, recorded in different brain states and paradigms; and it is time consuming.',
    widget: 'validation:difficult',
  },
  {
    say: 'Future models will be built from electron microscopy',
    note: 'Reconstructions such as MICrONS give morphologies, placement and connectivity synapse by synapse. Their physiology, and the synaptic input from outside the volume, must still be added. Collaboration, standardisation and iteration will make them more valid.',
    widget: 'validation:future',
  },
  {
    say: 'Other validated large-scale models',
    note: 'Allen V1, mouse M1 and a human layer 2/3 microcircuit each match real activity in some ways, and leave other things unconstrained: their recurrent wiring, and the human cell types still unmeasured.',
    widget: 'validation:examples',
  },
];
