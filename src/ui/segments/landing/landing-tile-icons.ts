/**
 * The subjects shown on the landing's tiles, each with its icon, as in the supplied Icons_V2.pdf (in its order). Icons
 * cut from the PDF onto a see-through ground (public/static/landing-v1/icons).
 */
const SUBJECT_WORDS = [
  'Explore',
  'Build',
  'Simulate',
  'Analyze',
  'Brain Regions',
  'Morphologies',
  'Traces',
  'Flywire',
  'Workflows',
  'Spines',
  'Ion Channels',
  'Notebooks',
  'Multi-Species',
  'EM-Microscopy',
  'Skeletonization',
] as const;

export const LANDING_SUBJECTS: ReadonlyArray<{ word: string; icon: string }> = SUBJECT_WORDS.map(
  (word) => ({
    word,
    // Retain the supplied artwork's filename while displaying the requested label.
    icon: `/static/landing-v1/icons/${word === 'Analyze' ? 'analyse' : word.toLowerCase().replace(/ /g, '-')}.png`,
  })
);
