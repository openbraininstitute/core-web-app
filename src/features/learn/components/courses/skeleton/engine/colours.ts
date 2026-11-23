/**
 * The skeleton figure's fixed colours, as CSS: the 3D view paints with them (`paint.ts`) and the
 * key and panels name them. Nothing to load here, so a panel can use them without the 3D view.
 */

/** The SWC types' colours: the soma warm, the dendrites a calm blue that no spine's colour is near. */
export const TYPE_COLOURS: Readonly<Record<number, string>> = {
  1: '#f0b45e',
  2: '#c4b5fd',
  3: '#5b9cf2',
  4: '#f472b6',
};
export const TYPE_NAMES: Readonly<Record<number, string>> = {
  1: 'Soma',
  2: 'Axon',
  3: 'Basal dendrite',
  4: 'Apical dendrite',
};
/** Everything in one quiet colour, where the spines are what is shown. */
export const PLAIN = '#8d99ad';
/** A frame's axes, x, y and z: red, green and blue, as the 3D tools draw them. */
export const AXIS_COLOURS = ['#ff6b6b', '#5ee08a', '#5aa9ff'] as const;
/** What is dimmed while something else is lit. */
export const DIM = '#4b5363';
/** The lit section, in its type's colour but brighter. */
export const LIT = '#8cc4ff';
/** The membrane as the EM viewer draws it: a matte, waxy grey. */
export const MEMBRANE = '#b9b2a8';
export const GLASS = '#dbe6f3';
/** The soma when each section has its colour: the spine table counts it as section 0, of no type's hue. */
export const SOMA_SECTION = '#cbd2dd';

/** Distance along a spine from its dendrite, near to far: plasma, from where it reads on dark. */
export const HEIGHT_RAMP = ['#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'] as const;
/** Spine length, short to long: viridis, from where it reads on dark. */
export const LENGTH_RAMP = ['#3b528b', '#21918c', '#5ec962', '#fde725'] as const;
