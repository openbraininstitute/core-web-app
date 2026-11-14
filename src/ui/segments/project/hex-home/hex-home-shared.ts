import { useEffect, useState } from 'react';

import type { IExample } from '@/ui/segments/project/hex-home/content';

/** What the platform's home is made of, for its wide layout and its phone one alike. */

/** The five categories: a column of hexagons down the left on a wide screen, a row to tap on a phone. */
export const CATEGORIES = [
  { key: 'examples', label: 'Examples', note: 'Models across species and scales', icon: 'examples' },
  { key: 'build', label: 'Do science', note: 'Data, workflows and notebooks', icon: 'workflows' },
  { key: 'learn', label: 'Learn & teach', note: 'Tutorials, courses and more', icon: 'learning' },
  { key: 'videos', label: 'Tutorial videos', note: 'See the platform in action', icon: 'tutorials' },
  { key: 'institute', label: 'The institute', note: 'About, news and pricing', icon: 'about' },
] as const;

export type TCategoryKey = (typeof CATEGORIES)[number]['key'];

/** Placeholder words for the example in the middle, until each has its own (user: FlyWire biophysically-detailed). */
export const MODEL = {
  kicker: 'Example model',
  name: 'FlyWire biophysically-detailed',
  about:
    'A biophysically-detailed model of the adult fly brain built on the FlyWire connectome: each neuron with its reconstructed morphology, its ion channels, and its synapses placed where FlyWire finds them. Placeholder text for now.',
};

/** How long the words about the one on show take to fade out, and then in again (ms). */
export const WORDS_FADE_MS = 300;

/**
 * `value` as it is shown while it changes: the last one stays, fading out (`fading`), and then the new one is shown
 * and fades in, so the words about the one on show change with a fade out and in (the user asked).
 */
export function useFadeSwap<T>(value: T, ms = WORDS_FADE_MS) {
  const [said, setSaid] = useState(value);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (value === said) {
      setFading(false);
      return;
    }
    setFading(true);
    const t = setTimeout(() => setSaid(value), ms);
    return () => clearTimeout(t);
  }, [value, said, ms]);
  return { said, fading };
}

/** The words under the one on show: the FlyWire placeholder for the fly brain, each other example's own. */
export function wordsFor(example: IExample) {
  return example.key === 'fly-brain' ? MODEL : { kicker: 'Example', name: example.label, about: example.blurb };
}
export const GREEN = '#008c05';

/**
 * Do science's five cards, each in colours of its own (the user asked to try it: one pink with yellow words, one blue
 * with green), in the order of its cards: Data, Workflows, Notebooks, Virtual labs, Reports.
 */
// softened (the user asked): dusty rose and butter, cornflower and mint, buttercream and violet, sage teal and blush,
// apricot and indigo, mint and plum
export const PLACE_COLOURS = [
  { bg: '#c9789a', ink: '#fff0a8' },
  { bg: '#6684cf', ink: '#c8f5d4' },
  { bg: '#f3dc92', ink: '#4a3d8c' },
  { bg: '#5f9e97', ink: '#ffe1ec' },
  { bg: '#eda083', ink: '#2c2868' },
  { bg: '#a3d9c1', ink: '#4a2453' },
  // Learn and Teach, on the rows home's Do science (the user asked): lavender and cream, sky and navy
  { bg: '#a99ad8', ink: '#fff4c9' },
  { bg: '#8ec3e6', ink: '#24306e' },
];
/**
 * Do science and its sixth card in the order the cards come (Data, Workflows, Notebooks, Virtual labs, Reports,
 * AI + MCP Server). A card's colours by its place in the list.
 */
export const placeColours = (i: number) => PLACE_COLOURS[i % PLACE_COLOURS.length];
