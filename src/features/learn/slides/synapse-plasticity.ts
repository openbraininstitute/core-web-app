import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The learn app's synapse explorer, as slides: short-term plasticity in the Tsodyks–Markram
 * model with stochastic release, then long-term, calcium-based plasticity.
 */
export const SYNAPSE_PLASTICITY_SLIDES: Slide[] = [
  {
    say: 'A synapse changes as you use it',
    note: 'Within a train of spikes, some connections run down and others build up. The Tsodyks–Markram model tracks how likely each site is to release (u, facilitation) and how many are still loaded (R, depression); release is stochastic.',
    widget: 'synapse-short',
  },
  {
    say: 'Depressing or facilitating',
    note: 'High release probability with slow recovery depresses: the first spike spends the resources. Low release probability with long-lived facilitation warms up over the first few spikes. Both are measured between cortical cell types.',
    widget: 'synapse-short',
  },
  {
    say: 'Release is stochastic',
    note: 'A handful of independent sites each release with probability u, so single trials show failures and scatter. Drop the sites to 1: the mean still follows the model, but most spikes fail.',
    widget: 'synapse-short',
  },
  {
    say: 'Over minutes, calcium decides',
    note: 'Glutamate lets calcium in through NMDA receptors, the postsynaptic spike through voltage-gated channels. Moderate calcium depresses the synapse, a lot potentiates it, and the efficacy is bistable, so the change sticks.',
    widget: 'synapse-long',
  },
  {
    say: 'Timing, and the calcium outside, matter',
    note: 'Pre just before post, and the two calcium sources stack up to potentiate. In 2 mM calcium, as in a slice, a protocol potentiates; in 1.2 mM, as in the brain, the same protocol does almost nothing.',
    widget: 'synapse-long',
  },
];
