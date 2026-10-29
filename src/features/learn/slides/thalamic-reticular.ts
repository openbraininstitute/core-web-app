import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The thalamic reticular nucleus: the thin shell of inhibitory neurons around the thalamus,
 * which every signal between the thalamus and the cortex passes through — and eight of its
 * neurons, reconstructed whole.
 */
export const THALAMIC_RETICULAR_SLIDES: Slide[] = [
  {
    say: 'Deep in the middle of the brain sits the thalamus.',
    note: 'Wrapped around it, like a thin shell, is a sheet of neurons: the thalamic reticular nucleus.',
    widget: 'brain',
  },
  {
    say: 'Every signal between the thalamus and the cortex passes through it.',
    note: 'Axons going both ways leave branches on its neurons. They are all inhibitory: they send GABA back onto the thalamus’s relay cells, and nothing on to the cortex.',
  },
  {
    say: 'Here are eight of them, each reconstructed whole from a mouse brain.',
    note: 'Each sends its axon back into the thalamus. Under each is the nucleus that gets the largest share of it.',
    widget: 'reticular:cells',
  },
];
