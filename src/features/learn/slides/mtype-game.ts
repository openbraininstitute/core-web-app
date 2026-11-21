import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * A game of shapes: the 26 kinds of neuron of the rat's somatosensory cortex, one real cell of
 * each, to be named from its shape alone — first its family, then the excitatory kinds, the
 * interneurons, and all 26, ten cells to a game.
 */
export const MTYPE_GAME_SLIDES: Slide[] = [
  {
    say: 'Every kind of neuron has a shape of its own',
    note: "These are 26 real cells, one of each kind found in the rat's somatosensory cortex. Look them over: each slide after this one is a game, naming them from their shapes.",
    widget: 'kinds',
  },
  {
    say: 'First: excitatory or inhibitory?',
    note: 'Pyramidal cells send an apical dendrite up towards the surface; interneurons have none, and are told apart by their axons, drawn in blue. Drag a cell to turn it.',
    widget: 'mtypes:family',
  },
  {
    say: 'Now name the excitatory cells',
    note: 'Watch the apical dendrite: how far it climbs, whether it ends in a tuft, and where it forks. Eleven kinds, four choices to a cell.',
    widget: 'mtypes:excitatory',
  },
  {
    say: 'Then the interneurons, by their axons',
    note: 'Where the axon goes — up, down, sideways or round the soma — and how densely it branches. Fifteen kinds.',
    widget: 'mtypes:interneurons',
  },
  {
    say: 'And all 26 together',
    note: 'Any kind at all, the choices beside it mostly from its own family.',
    widget: 'mtypes:all',
  },
  {
    say: 'To learn what each kind does, take the course on the cells of the cortex',
    widget: 'kinds',
    cta: { course: 'cortical-cells', label: 'The cells of the cortex' },
  },
];
