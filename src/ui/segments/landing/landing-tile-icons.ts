/**
 * The subjects shown on the landing's tiles, each with its icon, as in the supplied Icons_V1.pdf (in its order). Icons
 * cut from the PDF onto a see-through ground (public/static/landing-v1/icons).
 */
const SUBJECT_WORDS = [
  'Explore',
  'Build',
  'Simulate',
  'Analyse',
  'Brain Regions',
  'Morphologies',
  'E-Physiologies',
  'Single Neuron',
  'Synapotome',
  'Spines',
  'Ion Channel',
  'Notebooks',
  'Atlas',
  'E-Microscopy',
  'Skeletonization',
  'Human',
  'Mouse',
  'Rat',
  'Flywire',
  'Brain Models',
  'Species',
] as const;

export const LANDING_SUBJECTS: ReadonlyArray<{ word: string; icon: string }> = SUBJECT_WORDS.map(
  (word) => ({
    word,
    icon: `/static/landing-v1/icons/${word.toLowerCase().replace(/ /g, '-')}.png`,
  })
);
