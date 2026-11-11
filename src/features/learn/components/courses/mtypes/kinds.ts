/**
 * The 26 kinds of neuron the game asks about, by the cortex course's codes for them, whose names it
 * shares (`KINDS` in `cortex/Cortex.tsx`): each one's family; its look, shared with the kinds it is
 * most easily taken for, which are offered against it first; and what gives it away, as its cell in
 * `/static/learn/heuristics/mtypes.json` shows it.
 */

import { KINDS as CORTEX_KINDS } from '@/features/learn/components/cortex/Cortex';

export type Family = 'excitatory' | 'inhibitory';

interface Kind {
  family: Family;
  look: string;
  tell: string;
}

export const KINDS: Record<string, Kind> = {
  DAC: {
    family: 'inhibitory',
    look: 'layer 1',
    tell: 'Its soma is in layer 1, and its axon runs down out of it, into the layers below.',
  },
  'NGC-DA': {
    family: 'inhibitory',
    look: 'neurogliaform',
    tell: 'Tiny dendrites, wrapped in a dense tangle of fine axon.',
  },
  'NGC-SA': {
    family: 'inhibitory',
    look: 'neurogliaform',
    tell: 'Like the dense neurogliaform cell, but its axon sparser and its dendrites longer.',
  },
  HAC: {
    family: 'inhibitory',
    look: 'layer 1',
    tell: 'Its axon runs out sideways along layer 1, hardly going up or down.',
  },
  LAC: {
    family: 'inhibitory',
    look: 'layer 1',
    tell: "The biggest axon of layer 1's cells, spreading wide and down into layer 2/3.",
  },
  SAC: {
    family: 'inhibitory',
    look: 'layer 1',
    tell: "A smaller axon than the large and horizontal axon cells', kept to layer 1 round the soma.",
  },
  MC: {
    family: 'inhibitory',
    look: 'vertical',
    tell: 'Its axon climbs from deep in the cortex all the way up to layer 1, and spreads out there.',
  },
  BTC: {
    family: 'inhibitory',
    look: 'vertical',
    tell: 'Its dendrites grow in two tufts, one from the top of the soma and one from its bottom.',
  },
  DBC: {
    family: 'inhibitory',
    look: 'vertical',
    tell: "A narrow bundle of axon dropping straight down the column, like a horse's tail.",
  },
  BP: {
    family: 'inhibitory',
    look: 'vertical',
    tell: 'Small and slim: one dendrite up, one down, and a thin axon straight down.',
  },
  NGC: {
    family: 'inhibitory',
    look: 'neurogliaform',
    tell: 'Many short dendrites inside a small, dense cloud of fine axon.',
  },
  LBC: {
    family: 'inhibitory',
    look: 'basket',
    tell: 'A large axon, branching far out to the sides and down through the layers.',
  },
  NBC: {
    family: 'inhibitory',
    look: 'basket',
    tell: "Its axon stays nearer home than a large basket cell's, dense round the soma and above it.",
  },
  SBC: {
    family: 'inhibitory',
    look: 'basket',
    tell: 'A small, local axon of short, winding branches close round the soma.',
  },
  ChC: {
    family: 'inhibitory',
    look: 'basket',
    tell: 'Its axon, all below the soma, ends in short straight rows of boutons, like candles.',
  },
  PC: {
    family: 'excitatory',
    look: 'short apical',
    tell: "Layer 2/3's: a short apical dendrite climbs to layer 1 and tufts there, over basal dendrites round the soma.",
  },
  SP: {
    family: 'excitatory',
    look: 'short apical',
    tell: "Layer 4's: a thin apical dendrite, with no tuft, over a star of basal dendrites.",
  },
  SS: {
    family: 'excitatory',
    look: 'short apical',
    tell: 'No apical dendrite at all: its dendrites spread out round the soma, like a star.',
  },
  TTPC1: {
    family: 'excitatory',
    look: 'layer 5',
    tell: 'A thick apical dendrite climbs a millimetre to layer 1, forking into its tuft only near the top.',
  },
  TTPC2: {
    family: 'excitatory',
    look: 'layer 5',
    tell: 'Its apical dendrite forks early, low down, into trunks that end in a broad tuft.',
  },
  UTPC: {
    family: 'excitatory',
    look: 'layer 5',
    tell: 'Its apical dendrite stops short of layer 1, with no tuft.',
  },
  STPC: {
    family: 'excitatory',
    look: 'layer 5',
    tell: 'A slender apical dendrite reaches up with only a small tuft.',
  },
  'TPC-L4': {
    family: 'excitatory',
    look: 'layer 6',
    tell: "Layer 6's: its apical dendrite ends in a broad tuft, around layer 4.",
  },
  'TPC-L1': {
    family: 'excitatory',
    look: 'layer 6',
    tell: "Layer 6's: a slender apical dendrite climbs all the way to layer 1, with a small tuft.",
  },
  IPC: {
    family: 'excitatory',
    look: 'layer 6',
    tell: 'Upside down: its main dendrite points down, towards the white matter.',
  },
  BPC: {
    family: 'excitatory',
    look: 'layer 6',
    tell: 'Two main dendrites from a slim soma, one up and one down.',
  },
};

/** What tells each family apart, said after a guess at it. */
export const FAMILY_TELLS: Record<Family, string> = {
  excitatory:
    'Excitatory cells here are pyramidal, with an apical dendrite climbing towards the surface — or, in layer 4, spiny stellate.',
  inhibitory: 'Interneurons have no apical dendrite, and are told apart by their axons.',
};

/** A kind's name, as the cortex course has it: "Chandelier cell". */
export const nameOf = (type: string) => CORTEX_KINDS[type]?.name ?? type;

/** A kind's name after "a" or "an", mid-sentence: "a chandelier cell", "a Martinotti cell". */
export function aName(type: string) {
  const name = nameOf(type);
  const said = name.startsWith('Martinotti') ? name : name.charAt(0).toLowerCase() + name.slice(1);
  return `${/^[aeiou]/i.test(said) ? 'an' : 'a'} ${said}`;
}
