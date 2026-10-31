import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The Tsodyks–Markram synapse: short-term plasticity, depression and facilitation; the model's resources and their
 * use, and its three numbers; release made stochastic; and the Blue Brain Project's version — its synapse types,
 * receptors, and multivesicular release, from 2019 on.
 */
export const TSODYKS_MARKRAM_SLIDES: Slide[] = [
  {
    say: 'A synapse’s strength is not fixed: it changes with the spikes that came just before, over tens of milliseconds to seconds. This is short-term plasticity',
    section: 'Short-term plasticity',
    widget: 'tm:train',
  },
  {
    say: 'At some synapses each response is smaller than the last: they depress. At others, each is larger: they facilitate',
    widget: 'tm:kinds',
  },
  {
    say: 'In 1997, Tsodyks and Markram modelled depression with resources: R, the fraction of the synapse’s resources available, from 0 to 1. Each spike uses some up, and between spikes they recover, with a time constant D',
    section: 'The Tsodyks–Markram model',
    widget: 'tm:resources',
  },
  {
    say: 'Each spike uses a fraction U of what is available: its response is proportional to U × R, and R falls by that much',
    widget: 'tm:use',
  },
  {
    say: 'In 1998, Markram, Wang and Tsodyks added facilitation: the fraction used, u, rises with each spike, and fades between them, with a time constant F',
    widget: 'tm:facilitation',
  },
  {
    say: 'So three numbers describe a synapse’s short-term dynamics: U, D and F',
    widget: 'tm:rules',
  },
  {
    say: 'Depressing synapses, such as those between neocortical pyramidal cells, use a lot at once and recover slowly',
    widget: 'tm:depressing',
  },
  {
    say: 'Facilitating synapses, such as those from pyramidal cells onto some interneurons, use little at first, and facilitate for a long time',
    widget: 'tm:facilitating',
  },
  {
    say: 'Try it: pick a synapse, set U, D and F and the spike train, and watch its responses',
    widget: 'synapse-short',
  },
  {
    say: 'Neurotransmitter is released in vesicles, each released or not by chance. In 2002, Fuhrmann and colleagues made the model stochastic: each available release site releases with probability u, and recovers after a random time, D on average',
    section: 'Stochastic release',
    widget: 'tm:stochastic',
  },
  {
    say: 'So no two trials are alike, and some spikes release nothing at all: failures. Averaged over many trials, the responses are the deterministic model’s',
    widget: 'tm:trials',
  },
  {
    say: 'The Blue Brain Project’s 2015 reconstruction of the neocortical microcircuit runs this stochastic model at every synapse, with U, D and F for each pathway from paired recordings, grouped into types',
    section: 'The Blue Brain Project’s synapses',
    widget: 'tm:bbp',
  },
  {
    say: 'Each release opens receptors with their own kinetics: AMPA and NMDA receptors at excitatory synapses, the NMDA ones blocked by magnesium near rest, and GABA_A and GABA_B receptors at inhibitory ones',
    widget: 'tm:conductance',
  },
  {
    say: 'In 2019, Barros-Zulaica and colleagues added multivesicular release: each contact holds a small pool of vesicles, N_RRP, each released with probability u, so one spike can release several',
    widget: 'tm:mvr',
  },
  {
    say: 'N_RRP is set for each pathway so that the model varies from trial to trial as much as the paired recordings do: the more vesicles, the less the responses vary',
    widget: 'tm:cv',
  },
  {
    say: 'Later models, of the hippocampus’ CA1 and of the somatosensory cortex, use this version, with release probabilities lowered for the calcium in the brain, which is lower than in most slice experiments',
    cta: { course: 'synapse-plasticity', label: 'Plasticity at a synapse' },
  },
];
