'use client';

/**
 * Ten more on the same ten real neurons, wetter: glossy branches that narrow
 * towards their tips, a soma that swells out into them, in fluid rather than
 * on paper — and the signals told by colour more than by arrows. Afferent
 * axons, other neurons', bring signals in; the neuron's own efferent axon
 * takes its own out.
 *
 * One figure over twelve slides, each carrying on from the last:
 *
 * - brain: a glassy mouse brain, turning.
 * - cells: the view closes in on the tissue around one neuron, and turns to
 *   face it; the other kinds of cell there come into view — an astrocyte, a
 *   microglial cell and an oligodendrocyte precursor, reconstructions of real
 *   ones; an oligodendrocyte, myelinating the neuron's axon, and a blood
 *   vessel, drawn.
 * - neurons: the others fade, and the view draws back to the neuron, whole.
 * - gallery, atlas, mouse: the ten neurons together — side by side, each
 *   turning; each in its place in the brain, its region in its colour; and
 *   the brain in a mouse.
 * - area, between the last two: the view closes in on the somatosensory
 *   cortex, and in its place come the 26 kinds of neuron found there, side by
 *   side, one real cell of each, turning, named (see KIND_NAMES).
 * - whole: back to the one neuron, whole.
 * - dendrites, soma, axon: each part of it picked out on its own slide — the
 *   dendrites sparkling where inputs land, the soma pulsing, and signals
 *   running out along the axon.
 * - dendrogram: it stops turning, and its branches straighten out into a
 *   dendrogram — each drawn straight, as long as it runs from the soma, the
 *   dendrites up and the axon down — flat, its gloss and shadow gone.
 * - signals, on the dendrogram: afferent axons reach in and end on the
 *   dendrites. Pulses run along them, down the dendrites to the soma, and once
 *   enough have arrived it fires one of its own along the efferent axon.
 *
 * And ten more of the same on plain white (`white` looks): no fluid, the cell
 * floating above a floor, the soft shadow it casts there the only ground.
 *
 * MouseLight reconstructions carry no diameters, so theirs are grown back
 * from thin tips (see `taper`); the mitral and Purkinje cells' are measured.
 */

import {
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';

import { useCanvasFrame } from '@/features/learn/components/basics/useCanvasFrame';
import { useSpillRoot } from '@/features/learn/components/basics/useSpillRoot';
import { Embedded } from '@/features/learn/components/embedded';
import { mulberry32 } from '@/features/learn/lib/basics/morphologies';
import { savedSomaZoom, savedSpill, subscribe } from '@/features/learn/lib/settings';

import {
  clamp01,
  FIGURE_CLASS,
  lerp,
  mix,
  moving,
  type Pt,
  phase,
  type RGB,
  rgba,
  SERIF,
  STAGES,
  type Stage,
  smooth,
} from '../shared';
import { type Glia, loadGlia, loadMesh, loadNeuron, type Mesh, type Neuron, type V3 } from './data';
import { type GlassLayer, renderGlass, surface } from './glass';
import {
  EYES,
  GROUND,
  LEGS,
  mouseMesh,
  mouseParts,
  SPINE,
  TAIL,
  WHISKER_NERVE,
  WHISKERS,
} from './mouse';
import { rounded } from './smooth';
import { buildSoma, radiiAt, type SomaMesh } from './soma';
import {
  add,
  at,
  capital,
  centreOf,
  clamp,
  cross,
  depthOf,
  dot,
  type Ext,
  extent,
  fadeOver,
  length,
  lengths,
  PITCH,
  type Placed,
  place,
  pointAt,
  ROUND,
  SPIN,
  scale,
  sub,
  turn,
  unit,
  upTo,
  type View,
  view,
} from './space';

interface Look {
  /** The fluid, centre to edge. */
  bg: [RGB, RGB];
  /** The neuron: its dendrites, and its soma, told apart. */
  cell: RGB;
  soma: RGB;
  /** Afferent axons, other neurons', coming in; and its own efferent axon, going out. */
  aff: RGB;
  eff: RGB;
  /** The brain's glassy surface, and what floats about the cell. */
  glass: RGB;
  mote: RGB;
  text: RGB;
  /** On plain white, floating above its own shadow, rather than in fluid. */
  white?: boolean;
}

const LOOKS: Record<'plasma' | 'twophoton' | 'cleared' | 'tissue' | 'glow', Look> = {
  // a cell in fluid: rose membrane in deep blue
  plasma: {
    bg: [
      [16, 34, 66],
      [3, 8, 20],
    ],
    cell: [255, 132, 152],
    soma: [176, 146, 255],
    aff: [84, 216, 255],
    eff: [255, 190, 80],
    glass: [150, 190, 255],
    mote: [110, 150, 220],
    text: [200, 214, 236],
  },
  // two-photon: a red-filled cell, green-labelled inputs
  twophoton: {
    bg: [
      [24, 22, 26],
      [3, 3, 5],
    ],
    cell: [255, 92, 78],
    soma: [116, 164, 255],
    aff: [104, 240, 128],
    eff: [255, 204, 76],
    glass: [150, 170, 220],
    mote: [150, 80, 80],
    text: [220, 210, 210],
  },
  // cleared tissue: pearl in teal
  cleared: {
    bg: [
      [10, 52, 58],
      [2, 14, 18],
    ],
    cell: [236, 238, 255],
    soma: [255, 122, 160],
    aff: [128, 170, 255],
    eff: [255, 178, 86],
    glass: [150, 236, 226],
    mote: [80, 170, 170],
    text: [196, 230, 228],
  },
  // tissue: flesh pink in wine
  tissue: {
    bg: [
      [60, 18, 32],
      [14, 3, 8],
    ],
    cell: [255, 190, 200],
    soma: [190, 150, 255],
    aff: [124, 204, 255],
    eff: [240, 236, 104],
    glass: [190, 170, 255],
    mote: [170, 80, 100],
    text: [240, 206, 214],
  },
  // bioluminescent: mint in the dark
  glow: {
    bg: [
      [10, 40, 26],
      [1, 10, 6],
    ],
    cell: [136, 255, 204],
    soma: [255, 112, 160],
    aff: [168, 150, 255],
    eff: [255, 154, 76],
    glass: [110, 190, 255],
    mote: [70, 160, 110],
    text: [196, 236, 216],
  },
};

const PAPER: [RGB, RGB] = [
  [255, 255, 255],
  [255, 255, 255],
];
const INK: RGB = [30, 41, 59];

/** The same five, on white: colours deep enough to hold their own there, each pair of axons still told apart. */
const WHITE_LOOKS: Record<keyof typeof LOOKS, Look> = {
  plasma: {
    bg: PAPER,
    white: true,
    cell: [228, 86, 110],
    soma: [104, 74, 196],
    aff: [16, 142, 212],
    eff: [236, 146, 12],
    glass: [72, 100, 150],
    mote: INK,
    text: INK,
  },
  twophoton: {
    bg: PAPER,
    white: true,
    cell: [214, 52, 46],
    soma: [44, 96, 204],
    aff: [28, 156, 78],
    eff: [214, 160, 0],
    glass: [80, 96, 130],
    mote: INK,
    text: INK,
  },
  cleared: {
    bg: PAPER,
    white: true,
    cell: [122, 134, 170],
    soma: [206, 58, 98],
    aff: [52, 104, 226],
    eff: [236, 118, 28],
    glass: [64, 116, 128],
    mote: INK,
    text: INK,
  },
  tissue: {
    bg: PAPER,
    white: true,
    cell: [214, 74, 148],
    soma: [92, 70, 190],
    aff: [24, 146, 226],
    eff: [206, 160, 0],
    glass: [110, 86, 150],
    mote: INK,
    text: INK,
  },
  glow: {
    bg: PAPER,
    white: true,
    cell: [18, 156, 114],
    soma: [204, 46, 92],
    aff: [118, 86, 228],
    eff: [236, 116, 36],
    glass: [60, 110, 160],
    mote: INK,
    text: INK,
  },
};
const ON_WHITE = new Map(
  (Object.keys(LOOKS) as (keyof typeof LOOKS)[]).map((k) => [LOOKS[k], WHITE_LOOKS[k]])
);

interface Spec {
  id: string;
  cell: string;
  /** Where in the brain, as the caption says it. */
  where: string;
  look: Look;
  /** Whether its dendrites carry spines. */
  spiny: boolean;
  /** The soma's radius, µm, where the reconstruction does not say. */
  soma?: number;
}

const SPECS: Spec[] = [
  {
    id: 'AA0994',
    cell: 'layer 6 pyramidal neuron',
    where: 'somatosensory cortex',
    look: LOOKS.cleared,
    spiny: true,
    soma: 7.5,
  },
  {
    id: 'AA0664',
    cell: 'layer 5 pyramidal neuron',
    where: 'motor cortex',
    look: LOOKS.twophoton,
    spiny: true,
    soma: 9,
  },
  { id: 'TM6', cell: 'mitral cell', where: 'olfactory bulb', look: LOOKS.plasma, spiny: false },
  {
    id: 'AA0949',
    cell: 'pyramidal neuron',
    where: 'visual cortex',
    look: LOOKS.tissue,
    spiny: true,
    soma: 8,
  },
  {
    id: 'AA0322',
    cell: 'relay neuron',
    where: 'thalamus',
    look: LOOKS.glow,
    spiny: false,
    soma: 9,
  },
  {
    id: 'AA0909',
    cell: 'CA1 pyramidal neuron',
    where: 'hippocampus',
    look: LOOKS.plasma,
    spiny: true,
    soma: 8,
  },
  {
    id: 'AA0361',
    cell: 'granule cell',
    where: 'dentate gyrus',
    look: LOOKS.twophoton,
    spiny: true,
    soma: 5.5,
  },
  {
    id: 'AA0560',
    cell: 'pyramidal neuron',
    where: 'subiculum',
    look: LOOKS.cleared,
    spiny: true,
    soma: 9,
  },
  {
    id: 'AA0616',
    cell: 'projection neuron',
    where: 'lateral hypothalamus',
    look: LOOKS.tissue,
    spiny: false,
    soma: 8,
  },
  {
    id: 'Purkinje-slice-ageP43-6',
    cell: 'Purkinje cell',
    where: 'cerebellum',
    look: LOOKS.glow,
    spiny: true,
  },
];
/**
 * On white, the five neurons that would share their looks with another get
 * colours of their own, so that when the ten are shown together — side by
 * side, and in the brain — each can be told from the rest.
 */
const OWN_LOOKS: Record<string, Pick<Look, 'cell' | 'soma' | 'aff' | 'eff'>> = {
  AA0909: { cell: [230, 126, 20], soma: [36, 96, 200], aff: [118, 86, 228], eff: [20, 150, 130] },
  AA0361: { cell: [138, 72, 196], soma: [222, 140, 10], aff: [28, 156, 78], eff: [226, 96, 40] },
  AA0560: { cell: [36, 110, 214], soma: [214, 60, 80], aff: [30, 160, 90], eff: [236, 146, 12] },
  AA0616: { cell: [120, 150, 24], soma: [170, 60, 170], aff: [24, 146, 226], eff: [226, 110, 30] },
  'Purkinje-slice-ageP43-6': {
    cell: [150, 96, 52],
    soma: [44, 96, 204],
    aff: [118, 86, 228],
    eff: [20, 150, 140],
  },
};
/** The same ten, on white. */
const FLOATING: Spec[] = SPECS.map((spec) => ({
  ...spec,
  look: { ...ON_WHITE.get(spec.look)!, ...OWN_LOOKS[spec.id] },
}));
/** The brains' glass, whichever of the ten is shown: always the one blue, the mitral cell's, on white or not. */
const brainGlass = (look: Look) => (look.white ? WHITE_LOOKS : LOOKS).plasma.glass;

/** The brain, ms: it fades in, then turns for as long as anyone looks. */
const BRAIN_IN = 900;
/**
 * Its cells, ms: the ten coming into view in the brain first; then — not
 * before the slide's words have typed out — the view closes in on the tissue
 * around one neuron, turning to face it; the other kinds of cell there come
 * into view, and each is named.
 */
const ZOOM_AT = 600;
const ZOOM_FOR = 3200;
const NAMES_AT = ZOOM_AT + ZOOM_FOR + 200;
const NAME_EVERY = 260;
const NAMED = NAMES_AT + 6 * NAME_EVERY + 400;
/** How much tissue that close view holds: µm from its middle to its top. */
const TISSUE = 170;
/** Closed in on the soma, when the settings ask for it: how many of its radii from its middle to the view's top. */
const SOMA_CLOSE = 5;
/** Whether the second slide names the neuron, and the other kinds of cell, with arrows to them. Both off for now. */
const NAME_NEURON = false;
const NAME_OTHERS = false;
/** The neuron, ms: the others fade, and the view draws back to the whole of it. */
const REFRAME_FOR = 1800;
/** Its dendrites, axon and soma, ms: the part picked out comes in, then pulses, one beat this long. */
const PART_IN = 500;
const PULSE = 1800;
/**
 * As a dendrogram, ms: it turns to face the view and stops, and its branches
 * straighten out into one, those nearest the soma first.
 */
const MORPH_FOR = 2600;
/**
 * The ten together, ms: side by side, each turning, the others coming in
 * beside this one and their names under them; then each in its place in the
 * brain, the brain and their regions coming in; then the brain in a mouse, the
 * view drawing back to take it in.
 */
const CREW_IN = 700;
const GALLERY_SPIN = 0.32;
/** Side by side, each of the ten turning at its own pace and its own way: so many times GALLERY_SPIN. */
const GALLERY_TURNS = [1, -0.8, 1.25, -1.1, 0.9, -1.3, 1.15, -0.9, 1.35, -1.05];
const ATLAS_IN = 1300;
/**
 * One region's own kinds of neuron, ms: from the atlas, the view closes in
 * AREA_ZOOM times on the somatosensory cortex, where AREA_ID lives, over
 * AREA_ZOOM_FOR ms, the ten in their places all the while; from KINDS_AT, the
 * kinds of neuron found there come into view within it, each at its layer's
 * depth and to the brain's own scale (see KIND_NAMES); and from AREA_AT they
 * come out of it to their places side by side, over AREA_IN ms, the page
 * coming in over the brain behind them.
 */
const AREA_ID = 'AA0994';
const AREA_ZOOM = 5;
const AREA_ZOOM_FOR = 1800;
const KINDS_AT = 200;
const AREA_AT = 2100;
const AREA_IN = 1300;
/**
 * The brain in a mouse, ms: on a slide of its own, still in the brain as the
 * atlas has it, signals passing from neuron to neuron for as long as it is
 * looked at; then, on the next, the view draws back to the mouse round it; a
 * command runs from the motor cortex down its spine to its legs; and it walks,
 * a stride every STRIDE ms, what its paws and whiskers feel running back up to
 * the brain.
 */
const DRAW_BACK = 2600;
const COMMAND_FOR = 1300;
const WALK_IN = 800;
const STRIDE = 900;
const SENSE_FOR = 1100;
const MOUSE_IN = DRAW_BACK + COMMAND_FOR + WALK_IN;
/**
 * Who signals whom, on the mouse slide, and when in each round, ms: along the
 * ways real projections run — some by way of regions not shown, as the
 * olfactory bulb's to the dentate gyrus runs by the entorhinal cortex — and
 * how long a round is, and a signal's way across.
 */
const TALK: [string, string, number][] = [
  ['AA0322', 'AA0994', 0], // thalamus to somatosensory cortex
  ['AA0994', 'AA0664', 1000], // somatosensory to motor cortex
  ['AA0994', 'AA0322', 1300], // and back to the thalamus
  ['AA0949', 'AA0664', 500], // visual to motor cortex
  ['TM6', 'AA0361', 200], // olfactory bulb to dentate gyrus
  ['AA0361', 'AA0909', 1200], // dentate gyrus to CA1, by way of CA3
  ['AA0909', 'AA0560', 2200], // CA1 to subiculum
  ['AA0560', 'AA0616', 3100], // subiculum to the hypothalamus
  ['Purkinje-slice-ageP43-6', 'AA0322', 1700], // cerebellum to thalamus, by way of its deep nuclei
];
const TALK_EVERY = 3800;
const TALK_FOR = 1000;
/** The motor cortex's neuron, which commands the legs; and the thalamus's, which what they feel goes up to. */
const MOVER = 'AA0664';
const FEELER = 'AA0322';
/**
 * Learning, ms: the mouse stops, and a piece of cheese comes down in front of
 * it; then the view dives into its brain, to two neurons of the hippocampus —
 * a CA1 pyramidal neuron and one of the subiculum, which CA1 projects to — and
 * stays with them as they change: new branches sprouting from the first's axon
 * to make synapses on the second's dendrites, older ones lost, the dendrites'
 * tips drawing back and growing out again. A connection's life, made, kept and
 * lost, takes SITE_EVERY; a tip's, drawn back and grown out, TIP_EVERY.
 */
const CHEESE_FOR = 1800;
const DIVE_FOR = 3200;
const LEARN_IN = CHEESE_FOR + DIVE_FOR + 600;
/** Square on to the two, how long their turn about the line of sight takes to get up to speed, ms. */
const ROLL_IN = 1600;
const PRE = 'AA0909';
const POST = 'AA0560';
const SITE_EVERY = 5200;
const TIP_EVERY = 6400;
/**
 * The learned behaviour, ms: the mouse walks to the cheese — TO_CHEESE µm
 * along it, its nose stopping just short — and, there, sniffs at it, its
 * whiskers sweeping WHISK radians to and fro WHISK_EVERY ms.
 */
const TO_CHEESE = -31000;
const SEEK_AT = 500;
const SEEK_FOR = 4800;
const SEEK_IN = SEEK_AT + SEEK_FOR + 700;
const WHISK = 0.16;
const WHISK_EVERY = 125;
/**
 * Disorders of the brain and the nerves, neurological and psychiatric, named
 * all over the page as the mouse fades: the commonest first, and largest, each
 * coming in ILL_EVERY ms after the last, over ILL_IN ms.
 */
const ILLS = [
  'Alzheimer’s disease',
  'Depression',
  'Stroke',
  'Schizophrenia',
  'Parkinson’s disease',
  'Epilepsy',
  'Migraine',
  'Bipolar disorder',
  'Multiple sclerosis',
  'Anxiety disorders',
  'Huntington’s disease',
  'Post-traumatic stress disorder',
  'Amyotrophic lateral sclerosis',
  'Obsessive–compulsive disorder',
  'Addiction',
  'Frontotemporal dementia',
  'Dementia with Lewy bodies',
  'Anorexia nervosa',
  'Traumatic brain injury',
  'Panic disorder',
  'Vascular dementia',
  'ADHD',
  'Essential tremor',
  'Bulimia nervosa',
  'Dystonia',
  'Social anxiety disorder',
  'Spinal muscular atrophy',
  'Schizoaffective disorder',
  'Myasthenia gravis',
  'Borderline personality disorder',
  'Guillain–Barré syndrome',
  'Postpartum depression',
  'Charcot–Marie–Tooth disease',
  'Friedreich’s ataxia',
  'Spinocerebellar ataxia',
  'Creutzfeldt–Jakob disease',
  'Progressive supranuclear palsy',
  'Multiple system atrophy',
  'Narcolepsy',
  'Restless legs syndrome',
  'Tourette syndrome',
  'Cerebral palsy',
  'Dravet syndrome',
  'Rett syndrome',
  'Glioblastoma',
  'Neuromyelitis optica',
  'Trigeminal neuralgia',
  'Neuropathic pain',
  'Encephalitis',
  'Meningitis',
  'Hydrocephalus',
  'Tay–Sachs disease',
  'Batten disease',
  'Cluster headache',
  'Lennox–Gastaut syndrome',
];
const ILL_AT = 300;
const ILL_EVERY = 70;
const ILL_IN = 700;
/** And, leaving them, how long they take to fade, ms — the view moving on however long it takes. */
const ILL_OUT = 400;
/** Meanwhile, the mouse gone from round it, its brain in the middle: this much bigger than it was in the mouse. */
const ILL_ZOOM = 2.2;
const ILLS_IN = ILL_AT + ILLS.length * ILL_EVERY + ILL_IN;
/**
 * Closer in, on a piece of one dendrite, ms: the dendrogram drawn in on one of
 * its branches until the branch is ION_BAND of the figure's height across,
 * over ION_ZOOM ms — and then, a slide at a time, each coming in over LAYER_IN
 * ms, its membrane in its place; what the membrane keeps apart; the charge either
 * side of it, and the voltage that makes; and a synapse onto it.
 */
const ION_ZOOM = 3200;
const ION_BAND = 0.5;
/** How much bigger than as first set down its lipids, channels and ions are drawn — closer in, so less of it shows. */
const ION_SCALE = 1.6;
const LAYER_IN = 900;
/** On the membrane's first slide, a lens over a few of its lipids: opening at LENS_AT ms — not before the slide's words have typed out — over LENS_IN. */
const LENS_AT = LAYER_IN;
const LENS_IN = 700;
/**
 * Ions of both kinds either side of the membrane, coming in from CHARGES_AT ms —
 * not before the slide's words have typed out — over CHARGES_IN; then, on the
 * slide after, the slight excess of charge lining it either side at rest, from
 * IMBALANCE_AT.
 */
const CHARGES_AT = 300;
const CHARGES_IN = 1200;
const IMBALANCE_AT = 300;
/** Under the dendrite, the voltage the charge lining it makes, coming in from VOLT_AT ms — not before the slide's words have typed out. */
const VOLT_AT = 300;
/**
 * The synapse onto the dendrite, ms: a spike down the other neuron's axon every
 * SYN_EVERY from SYN_AT — not before the slide's words have typed out — taking
 * SYN_SPIKE to come down it; the transmitter it lets go crossing to the
 * dendrite over SYN_RELEASE; and after it SYN_IONS positive ions coming in
 * through the synapse, one every SYN_ION_EVERY, each taking SYN_ION_FOR to
 * cross. The voltage their charge makes there rises over SYN_RISE_FOR by
 * SYN_RISE mV and dies away, through the membrane, with a time constant of
 * SYN_TAU; spreading along the dendrite, it widens from SYN_WIDTH px — as first
 * set down (see ION_SCALE) — as the square root of the time since, twice as
 * wide after 3 SYN_SPREAD, and falls the more for it.
 */
const SYN_AT = 400;
const SYN_EVERY = 5400;
const SYN_SPIKE = 800;
const SYN_RELEASE = 260;
const SYN_IONS = 7;
const SYN_ION_EVERY = 100;
const SYN_ION_FOR = 520;
const SYN_RISE_FOR = 600;
const SYN_RISE = 18;
const SYN_TAU = 3500;
const SYN_WIDTH = 22;
const SYN_SPREAD = 450;
/** The slides close in on the piece of dendrite, in the order they build it up. */
const CLOSE = [
  'closer',
  'lipids',
  'membrane',
  'charges',
  'imbalance',
  'voltage',
  'synapse',
  'spread',
] as const;
const isClose = (stage: Stage): stage is (typeof CLOSE)[number] =>
  (CLOSE as readonly Stage[]).includes(stage);
/** Where each stage's picture is finished: shown at once, on a slide come back to. */
const DONE: Record<Stage, number> = {
  brain: BRAIN_IN,
  cells: NAMED,
  neurons: REFRAME_FOR + 200,
  whole: 0,
  dendrites: PART_IN,
  axon: PART_IN,
  soma: PART_IN,
  dendrogram: MORPH_FOR,
  signals: 0,
  gallery: CREW_IN + 400,
  atlas: ATLAS_IN,
  area: AREA_AT + AREA_IN,
  talk: 500,
  mouse: MOUSE_IN,
  learn: LEARN_IN,
  seek: SEEK_IN,
  disease: ILLS_IN,
  closer: ION_ZOOM,
  lipids: LENS_AT + LENS_IN,
  membrane: LAYER_IN,
  charges: CHARGES_AT + CHARGES_IN,
  imbalance: IMBALANCE_AT + LAYER_IN,
  voltage: VOLT_AT + LAYER_IN,
  // come back to, the first spike's charge just in
  synapse: SYN_AT + SYN_SPIKE + SYN_RELEASE + SYN_RISE_FOR + 300,
  spread: SYN_AT + SYN_SPIKE + SYN_RELEASE + SYN_RISE_FOR + 900,
};
/** Where a slide's picture waits, ms in, until its words have typed out: what it shows next is what they say. */
const WAIT_FOR_WORDS: Partial<Record<Stage, number>> = {
  cells: ZOOM_AT,
  lipids: LENS_AT,
  charges: CHARGES_AT,
  imbalance: IMBALANCE_AT,
  voltage: VOLT_AT,
  synapse: SYN_AT,
  spread: SYN_AT,
};
/** For the angle a slide starts at when nothing came before it: about how long after the cells it comes, ms. */
const STAY = 5000;
const LATER: Record<Exclude<Stage, 'brain' | 'cells'>, number> = {
  neurons: 0,
  whole: REFRAME_FOR,
  dendrites: REFRAME_FOR,
  soma: REFRAME_FOR + STAY,
  axon: REFRAME_FOR + 2 * STAY,
  dendrogram: REFRAME_FOR + 3 * STAY,
  signals: REFRAME_FOR + 4 * STAY,
  gallery: REFRAME_FOR + 5 * STAY,
  atlas: REFRAME_FOR + 6 * STAY,
  area: REFRAME_FOR + 6.5 * STAY,
  talk: REFRAME_FOR + 6.75 * STAY,
  mouse: REFRAME_FOR + 7 * STAY,
  learn: REFRAME_FOR + 8 * STAY,
  seek: REFRAME_FOR + 9 * STAY,
  disease: REFRAME_FOR + 10 * STAY,
  closer: REFRAME_FOR + 3.5 * STAY,
  lipids: REFRAME_FOR + 3.5 * STAY,
  membrane: REFRAME_FOR + 3.5 * STAY,
  charges: REFRAME_FOR + 3.5 * STAY,
  imbalance: REFRAME_FOR + 3.5 * STAY,
  voltage: REFRAME_FOR + 3.5 * STAY,
  synapse: REFRAME_FOR + 3.5 * STAY,
  spread: REFRAME_FOR + 3.5 * STAY,
};
/** The signals, ms: afferents reach in; pulses along them, then down the dendrites; the soma fires; again, every CYCLE. */
const FIRST_IN = 900;
const STAGGER = 220;
const IN_FOR = 800;
const DEND_FOR = 700;
const CYCLE = 4600;

/**
 * The other kinds of cell, in quieter colours than the neuron's own, and the
 * families their tubes are sorted into after the neuron's three (its dendrites,
 * its axon, and other neurons' axons).
 */
const OTHERS: { name: string; colour: RGB }[] = [
  { name: 'astrocyte', colour: [137, 112, 200] },
  { name: 'microglia', colour: [126, 148, 60] },
  { name: 'opc', colour: [46, 146, 146] },
  { name: 'oligodendrocyte', colour: [80, 118, 196] },
  { name: 'myelin', colour: [208, 220, 242] },
  // a blood vessel: a pale wall, and the red blood cells in it (erythrocytes, red with the haemoglobin they carry) —
  // red enough to say "blood" beside any neuron's colour
  { name: 'vessel', colour: [236, 204, 206] },
  { name: 'red cells', colour: [196, 34, 44] },
];
const [ASTROCYTE, MICROGLIA, OPC, OLIGODENDROCYTE, MYELIN, VESSEL, RED_CELLS] = [
  3, 4, 5, 6, 7, 8, 9,
];

type Part = 'dendrites' | 'axon' | 'soma';

/** Branches drawn thicker than life from afar, so that they show at all; nearer to life close up. */
const exaggerate = (s: number) => Math.max(1, Math.min(3.2, 0.9 + 0.35 / s));

/* ------------------------------------------------------------------ scene */

interface Afferent {
  /** The axon, from off in the tissue to its bouton on a dendrite, with µm along it. */
  pts: V3[];
  d: number[];
  /** From the bouton down the dendrite to the soma, with µm from the bouton; and the nodes it runs through. */
  route: V3[];
  routeD: number[];
  nodes: number[];
}

interface Scene extends Placed {
  /** The dendrites' own middle: what the neuron turns about when it is shown on its own, beside the others. */
  core: V3;
  /** The brain from front to back, µm. */
  brainLength: number;
  /** The dendrites' reach from their centre, letting the furthest few tips go — what slide 1 closes in to. */
  near: Ext;
  /** And theirs alone, about their own middle, the floor beneath them left out: what their own slide closes in to. */
  dendExt: Ext;
  /** Branch diameter at each node, µm, narrowing towards the tips. */
  diam: Float32Array;
  somaR: number;
  somaMesh: SomaMesh;
  root: Mesh;
  /** The neuron's region, its triangles on the neuron's side of the brain only. */
  region: Mesh;
  /** Spines: [node, centre (3), direction (3), dendrite radius, length], µm. */
  spines: Float32Array;
  /**
   * Swellings along the efferent axon: [node, how far along the segment to it from its parent (0 to 1), radius] —
   * found from where its ends are drawn, so that it stays on the segment however that is laid out.
   */
  beads: Float32Array;
  /** Specks adrift around the cell: [centre (3), radius]. */
  motes: Float32Array;
  aff: Afferent[];
  /**
   * On white, the floors the brain and the cell float above (DV, µm): the
   * outline of the brain's footprint on its own, [AP, ML] pairs; the cell's
   * branches as they fall on its, [AP, ML, AP, ML, diameter] per branch.
   */
  floors: {
    brain: number;
    hull: Float32Array;
    cell: number;
    foot: Float32Array;
    above: number;
  } | null;
  /** The view that shows the neuron best, which the second slide turns to: the angle its dendrites spread widest at. */
  yawPresent: number;
  /**
   * The other cells around it, for the second slide, laid out face-on to that
   * view: segments [a (3), b (3), diameter], µm, and somata [centre (3),
   * radius], each with its family; and a name for each, with where it is.
   */
  crowd: {
    segs: Float32Array;
    segFamily: Uint8Array;
    balls: Float32Array;
    ballFamily: Uint8Array;
    names: { text: string; at: V3; other: boolean }[];
    /** The labs whose reconstructions the glia are. */
    sources: string[];
  };
  /** Where to point at its dendrites and at its axon, on the slides that name them. */
  marks: { dendrite: V3; axon: V3 };
  /** Its dendrites in all: µm of them, and how many tips; and the nodes along them, past the soma, for sparkles to land on. */
  dendrites: { length: number; tips: number; nodes: Int32Array };
  /** Where the nodes last landed on screen, and how deep; and how far the turn into a dendrogram had carried each, px. */
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  mx: Float32Array;
  my: Float32Array;
  /** The afferents, as last drawn on screen. */
  leads: Pt[][];
  /** The dendrogram last laid out: kept while the figure's size, and the angle it was laid out from, stay put. */
  tree: Tree | null;
}

/**
 * Branch diameters that narrow towards the tips: the reconstruction's own
 * where it measured them. Otherwise grown back from thin tips — a little along
 * each length, and at each fork by d^2.2 = Σ d_k^2.2, nearer what dendrites
 * do than Rall's ideal 3/2. Axons stay thin, thickening only slowly with all
 * that hangs off them.
 */
function taper(n: Neuron, kids: number[][], tips: Float32Array) {
  if (n.measured) return n.width;
  const d = new Float32Array(n.x.length);
  for (let i = n.x.length - 1; i >= 1; i--) {
    if (n.type[i] === 2) {
      d[i] = Math.min(1.2, 0.35 + 0.1 * Math.log2(1 + tips[i]));
      continue;
    }
    let sum = 0;
    for (const c of kids[i]) {
      if (n.type[c] === 2) continue;
      const len = Math.hypot(n.x[c] - n.x[i], n.y[c] - n.y[i], n.z[c] - n.z[i]);
      sum += (d[c] + 0.002 * len) ** 2.2;
    }
    d[i] = sum > 0 ? Math.min(6, sum ** (1 / 2.2)) : 0.6;
  }
  d[0] = 16;
  return d;
}

/** The outline of flat (AP, DV, ML) triples seen from above: their convex hull, as [AP, ML] pairs. */
function footprint(pts: Float32Array) {
  const p: [number, number][] = [];
  for (let i = 0; i < pts.length; i += 3) p.push([pts[i], pts[i + 2]]);
  p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turnsLeft = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]) > 0;
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const q of list) {
      while (out.length >= 2 && !turnsLeft(out[out.length - 2], out[out.length - 1], q)) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return Float32Array.from([...half(p), ...half([...p].reverse())].flat());
}

/** How low and how high (DV, µm) the points of flat triples go. */
function heights(pts: ArrayLike<number>) {
  let low = -Infinity;
  let top = Infinity;
  for (let i = 1; i < pts.length; i += 3) {
    low = Math.max(low, pts[i]);
    top = Math.min(top, pts[i]);
  }
  return { low, top };
}

/** A smooth curve through points, `per` samples between each pair (Catmull–Rom). */
function curveThrough(pts: V3[], per: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b, c, d] = [
      pts[Math.max(0, i - 1)],
      pts[i],
      pts[i + 1],
      pts[Math.min(pts.length - 1, i + 2)],
    ];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        [0, 1, 2].map(
          (j) =>
            0.5 *
            (2 * b[j] +
              (c[j] - a[j]) * t +
              (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 +
              (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3)
        ) as V3
      );
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * The second slide's other cells, around the neuron's soma as the view at
 * `yaw` sees it. The three glia are real reconstructions, each turned face-on;
 * the oligodendrocyte is drawn, its myelin sheaths on the neuron's own axon;
 * and so is the blood vessel, run past the astrocyte so that its end-foot
 * touches it, as astrocytes' do.
 */
function crowdAround(soma: V3, out: Placed['out'], yaw: number, glia: Glia[]): Scene['crowd'] {
  const ct = Math.cos(yaw);
  const st = Math.sin(yaw);
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  const right: V3 = [ct, 0, -st];
  const down: V3 = [-st * sp, cp, -ct * sp];
  const away: V3 = [st * cp, sp, ct * cp];
  /** `x` right, `y` down and `z` away of the soma, as that view sees it; µm. */
  const there = (x: number, y: number, z: number): V3 =>
    add(soma, add(scale(right, x), add(scale(down, y), scale(away, z))));
  const segs: number[] = [];
  const segFamily: number[] = [];
  const balls: number[] = [];
  const ballFamily: number[] = [];
  const tube = (a: V3, b: V3, d: number, family: number) => {
    segs.push(...a, ...b, d);
    segFamily.push(family);
  };
  const ball = (c: V3, r: number, family: number) => {
    balls.push(...c, r);
    ballFamily.push(family);
  };
  /** A glial cell face-on, turned `angle` in the view's plane, its soma at (x, y, z); and where each of its nodes went, on screen and in the brain. */
  const glial = (
    g: Glia,
    family: number,
    x: number,
    y: number,
    z: number,
    angle: number,
    width: number
  ) => {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const flat = (i: number) =>
      [x + g.x[i] * ca - g.y[i] * sa, y + g.x[i] * sa + g.y[i] * ca] as const;
    const at3 = (i: number) => there(...flat(i), z + g.z[i]);
    for (let i = 1; i < g.x.length; i++) tube(at3(g.parent[i]), at3(i), width, family);
    ball(at3(0), Math.max(4, g.somaRadius), family);
    return { flat, at3 };
  };

  const [astro, micro, opc] = glia;
  const astrocyte = glial(astro, ASTROCYTE, -215, 50, 30, 0.3, 1.6);
  const microglia = glial(micro, MICROGLIA, -390, -70, 25, -0.5, 1.1);
  const precursor = glial(opc, OPC, 255, -90, 10, 0.9, 1.0);

  // the blood vessel, past the astrocyte's lowest tip: its end-foot
  const tips = new Uint8Array(astro.x.length).fill(1);
  for (let i = 1; i < astro.x.length; i++) tips[astro.parent[i]] = 0;
  let foot = 1;
  for (let i = 1; i < astro.x.length; i++)
    if (tips[i] && astrocyte.flat(i)[1] > astrocyte.flat(foot)[1]) foot = i;
  const [fx, fy] = astrocyte.flat(foot);
  // and on well past the figure's edges either way, so that drawn over the whole page it still runs off it
  const vessel = curveThrough(
    [
      there(-1800, fy + 90, 95),
      there(-640, fy + 40, 70),
      there(fx, fy + 5, 30),
      there(120, 140, 60),
      there(640, 95, 75),
      there(1800, 70, 95),
    ],
    16
  );
  for (let i = 1; i < vessel.length; i++) tube(vessel[i - 1], vessel[i], 9, VESSEL);
  // red blood cells in it, a few at a time, near enough to life size (a mouse's are about 6 µm across)
  for (let i = 2; i < vessel.length - 1; i += 3)
    if ((i * 7) % 5 < 3) ball(vessel[i], 2.6, RED_CELLS);
  ball(astrocyte.at3(foot), 2.4, ASTROCYTE);

  // the oligodendrocyte: three myelin sheaths along the neuron's axon from a little way out, and a process to
  // each — carrying on along the axon's line where a reconstruction stops short of them
  const { pts, d } = out;
  const last = pts.length - 1;
  const onward = last > 0 ? unit(sub(pts[last], pts[last - 1]), [0, 1, 0]) : ([0, 1, 0] as V3);
  const along = (want: number): V3 => {
    if (want >= d[last]) return add(pts[last], scale(onward, want - d[last]));
    let i = 1;
    while (i < last && d[i] < want) i++;
    const k = d[i] > d[i - 1] ? clamp01((want - d[i - 1]) / (d[i] - d[i - 1])) : 0;
    return add(pts[i - 1], scale(sub(pts[i], pts[i - 1]), k));
  };
  const sheaths: V3[] = [];
  for (let k = 0; k < 3; k++) {
    const from = 25 + 38 * k;
    let prev = along(from);
    for (let j = 1; j <= 6; j++) {
      const next = along(from + (34 * j) / 6);
      tube(prev, next, 2.8, MYELIN);
      prev = next;
    }
    sheaths.push(along(from + 17));
  }
  // its soma beside the middle sheath, off to one side of the axon as the view sees it
  const dir = sub(along(25 + 38 + 30), along(25 + 38));
  let [px, py] = [-dot(dir, down), dot(dir, right)];
  const l = Math.hypot(px, py) || 1;
  [px, py] = [px / l, py / l];
  if (px < 0) [px, py] = [-px, -py];
  const oligo = add(sheaths[1], add(scale(right, 30 * px), scale(down, 30 * py)));
  for (const sheath of sheaths) {
    const bend = add(
      scale(add(oligo, sheath), 0.5),
      add(scale(right, 6 * px), scale(down, 6 * py))
    );
    const arc = curveThrough([oligo, bend, sheath], 5);
    for (let i = 1; i < arc.length; i++) tube(arc[i - 1], arc[i], 0.9, OLIGODENDROCYTE);
  }
  ball(oligo, 5, OLIGODENDROCYTE);

  return {
    segs: Float32Array.from(segs),
    segFamily: Uint8Array.from(segFamily),
    balls: Float32Array.from(balls),
    ballFamily: Uint8Array.from(ballFamily),
    sources: glia.map((g) => g.source),
    names: [
      { text: 'Neuron', at: soma, other: false },
      { text: 'Astrocyte', at: astrocyte.at3(0), other: true },
      { text: 'Microglia', at: microglia.at3(0), other: true },
      { text: 'Oligodendrocyte precursor', at: precursor.at3(0), other: true },
      { text: 'Oligodendrocyte', at: oligo, other: true },
      // named where the figure shows it: four fifths of the way along the part of it between its two far ends
      { text: 'Blood vessel', at: vessel[16 + Math.round(48 * 0.8)], other: true },
    ],
  };
}

function buildScene(root: Mesh, regionMesh: Mesh, n: Neuron, spec: Spec, glia: Glia[]): Scene {
  // on white the brain floats above a floor just beneath it, and the view frames its shadow there too
  const white = !!spec.look.white;
  const brainH = heights(root.v);
  const brainFloor = brainH.low + 0.08 * (brainH.low - brainH.top);
  const hull = white ? footprint(root.v) : new Float32Array();
  const framed = new Float32Array(root.v.length + (hull.length / 2) * 3);
  framed.set(root.v);
  for (let k = 0; k < hull.length / 2; k++)
    framed.set([hull[k * 2], brainFloor, hull[k * 2 + 1]], root.v.length + k * 3);
  // the brain turns for as long as the first two slides are looked at: fit it at every angle
  const placed = place(framed, n, Infinity);
  const { wx, wy, wz, soma, brainCentre, side, centre, reach } = placed;
  const count = wx.length;
  const node = (i: number): V3 => [wx[i], wy[i], wz[i]];
  const kids: number[][] = Array.from({ length: count }, () => []);
  for (let i = 1; i < count; i++) kids[n.parent[i]].push(i);
  const tips = new Float32Array(count);
  for (let i = count - 1; i >= 1; i--) {
    if (!kids[i].length) tips[i] = 1;
    tips[n.parent[i]] += tips[i];
  }
  const diam = taper(n, kids, tips);
  const somaR = n.measured ? n.somaRadius : (spec.soma ?? 8);

  const dend: number[] = [];
  for (let i = 0; i < count; i++) if (n.type[i] !== 2) dend.push(wx[i], wy[i], wz[i]);

  // the region on the neuron's side
  const faces: number[] = [];
  const rv = regionMesh.v;
  for (let f = 0; f < regionMesh.f.length; f += 3) {
    const [a, b, c] = [regionMesh.f[f], regionMesh.f[f + 1], regionMesh.f[f + 2]];
    if ((rv[a * 3 + 2] + rv[b * 3 + 2] + rv[c * 3 + 2]) / 3 - brainCentre[2] >= 0 === side > 0)
      faces.push(a, b, c);
  }

  const rnd = mulberry32(count * 7 + 1);
  const across = (u: V3) => {
    const a = unit(cross(u, Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]), [1, 0, 0]);
    const b = cross(u, a);
    const turnBy = rnd() * Math.PI * 2;
    return add(scale(a, Math.cos(turnBy)), scale(b, Math.sin(turnBy)));
  };

  const spines: number[] = [];
  const beads: number[] = [];
  for (let i = 1; i < count; i++) {
    const p = n.parent[i];
    const seg = sub(node(i), node(p));
    const len = Math.hypot(seg[0], seg[1], seg[2]);
    if (len < 0.5) continue;
    const u = scale(seg, 1 / len);
    if (n.type[i] === 2) {
      // en passant swellings, every 12–18 µm
      for (let at = rnd() * 15; at < len; at += 12 + rnd() * 6) {
        beads.push(i, at / len, 0.45 + rnd() * 0.35);
      }
    } else if (spec.spiny && n.dist[i] > 15) {
      for (let k = Math.floor(len / 3.2 + rnd()); k > 0; k--) {
        spines.push(
          i,
          ...add(node(p), scale(seg, rnd())),
          ...across(u),
          diam[i] / 2,
          0.9 + rnd() * 0.7
        );
      }
    }
  }

  const motes: number[] = [];
  for (let k = 0; k < 80; k++) {
    const r = k < 12 ? 7 + rnd() * 5 : 1.5 + rnd() * 3.5;
    motes.push(
      ...add(centre, [
        (rnd() * 2 - 1) * 1.8 * reach,
        (rnd() * 2 - 1) * 1.8 * reach,
        (rnd() * 2 - 1) * 1.8 * reach,
      ]),
      r
    );
  }

  // afferents: to dendrites spread well apart, each ending part-way out along one
  const ends: number[] = [];
  for (let i = 1; i < count; i++) if (n.type[i] !== 2 && !kids[i].length) ends.push(i);
  ends.sort((a, b) => n.dist[b] - n.dist[a]);
  const apart = (gap: number) => {
    const out: number[] = [];
    for (const t of ends) {
      if (out.length >= 6) break;
      if (out.every((q) => Math.hypot(wx[q] - wx[t], wy[q] - wy[t], wz[q] - wz[t]) > gap))
        out.push(t);
    }
    return out;
  };
  const chosen = apart(0.5 * reach).length >= 4 ? apart(0.5 * reach) : apart(0.25 * reach);
  const aff = chosen.map((tip): Afferent => {
    const path: number[] = [];
    for (let k = tip; k >= 0; k = n.parent[k]) path.push(k);
    let j = 0;
    while (j < path.length - 1 && n.dist[path[j]] > 0.6 * n.dist[tip]) j++;
    const route = path.slice(j);
    const contact = node(route[0]);
    const out = unit(sub(contact, soma), [0, -1, 0]);
    const side1 = across(out);
    const side2 = cross(out, side1);
    const len = reach * (0.75 + rnd() * 0.35);
    const from = add(contact, add(scale(out, len * 0.75), scale(side1, len * 0.7)));
    const c1 = add(from, add(scale(out, -len * 0.15), scale(side1, -len * 0.45)));
    const c2 = add(contact, add(scale(side1, len * 0.3), scale(out, len * 0.1)));
    const [w1, w2] = [rnd() * 6, rnd() * 6];
    const pts = Array.from({ length: 49 }, (_, k): V3 => {
      const t = k / 48;
      const u = 1 - t;
      const p = [0, 1, 2].map(
        (i) =>
          u * u * u * from[i] +
          3 * u * u * t * c1[i] +
          3 * u * t * t * c2[i] +
          t * t * t * contact[i]
      ) as V3;
      // a little wander, none at either end
      const env = Math.sin(Math.PI * t) * len;
      return add(
        p,
        add(
          scale(side2, Math.sin(t * 15 + w1) * 0.025 * env),
          scale(side1, Math.sin(t * 10 + w2) * 0.015 * env)
        )
      );
    });
    const d = [0];
    for (let k = 1; k < pts.length; k++) d.push(d[k - 1] + Math.hypot(...sub(pts[k], pts[k - 1])));
    return {
      pts,
      d,
      route: route.map(node),
      routeD: route.map((k) => n.dist[route[0]] - n.dist[k]),
      nodes: route,
    };
  });

  // and the cell above a floor of its own, its centre and reach taking in the shadow it casts there
  let floors: Scene['floors'] = null;
  let middle = centre;
  let near = extent(dend, centre, ROUND, 0.85);
  if (white) {
    const { low, top } = heights(dend);
    const cell = low + 0.35 * reach;
    const foot: number[] = [];
    const fallen: number[] = [];
    for (let i = 1; i < count; i++) {
      if (n.type[i] === 2) continue;
      foot.push(wx[n.parent[i]], wz[n.parent[i]], wx[i], wz[i], diam[i]);
      fallen.push(wx[i], cell, wz[i]);
    }
    middle = [centre[0], (top + cell) / 2, centre[2]];
    const above = extent(dend, middle, ROUND, 0.85);
    const below = extent(fallen, middle, ROUND, 0.9);
    near = {
      hx: Math.max(above.hx, below.hx),
      hy: Math.max(above.hy, below.hy),
      hr: Math.max(above.hr, below.hr),
    };
    floors = { brain: brainFloor, hull, cell, foot: Float32Array.from(foot), above: cell - top };
  }

  let front = Infinity;
  let rear = -Infinity;
  for (let i = 0; i < root.v.length; i += 3) {
    front = Math.min(front, root.v[i]);
    rear = Math.max(rear, root.v[i]);
  }

  // the view that shows the neuron best: where its dendrites spread widest
  let yawPresent = 0;
  let widest = -1;
  for (const yaw of ROUND) {
    const e = extent(dend, centre, [yaw]);
    if (e.hx > widest) {
      widest = e.hx;
      yawPresent = yaw;
    }
  }

  // where to point at a dendrite (part-way out along its longest) and at the axon (a little way out along it)
  const longest = n.inputs[0] ?? [0];
  const tipDist = n.dist[longest[0]];
  let dm = longest[0];
  for (const k of longest)
    if (Math.abs(n.dist[k] - 0.55 * tipDist) < Math.abs(n.dist[dm] - 0.55 * tipDist)) dm = k;
  const { pts: outPts, d: outD } = placed.out;
  const want = Math.min(outD[outD.length - 1] * 0.6, 0.45 * reach);
  let ai = 0;
  while (ai < outD.length - 1 && outD[ai] < want) ai++;

  let dendLength = 0;
  let dendTips = 0;
  const dendNodes: number[] = [];
  for (let i = 1; i < count; i++) {
    if (n.type[i] === 2) continue;
    const q = n.parent[i];
    dendLength += Math.hypot(wx[i] - wx[q], wy[i] - wy[q], wz[i] - wz[q]);
    if (!kids[i].length) dendTips++;
    if (n.dist[i] > 2 * somaR) dendNodes.push(i);
  }

  return {
    ...placed,
    core: placed.centre,
    dendExt: extent(dend, centre, ROUND, 0.92),
    brainLength: rear - front,
    yawPresent,
    crowd: crowdAround(soma, placed.out, yawPresent, glia),
    marks: { dendrite: node(dm), axon: outPts[ai] },
    dendrites: { length: dendLength, tips: dendTips, nodes: Int32Array.from(dendNodes) },
    centre: middle,
    near,
    floors,
    diam,
    somaR,
    somaMesh: buildSoma(n, diam, kids, tips, somaR),
    root,
    region: { v: regionMesh.v, f: Uint32Array.from(faces) },
    spines: Float32Array.from(spines),
    beads: Float32Array.from(beads),
    motes: Float32Array.from(motes),
    aff,
    sx: new Float32Array(count),
    sy: new Float32Array(count),
    sz: new Float32Array(count),
    mx: new Float32Array(count),
    my: new Float32Array(count),
    leads: [],
    tree: null,
  };
}

const scenes = new Map<string, Scene>();
/** A scene, and the angle handed from slide 1 to 2, belong to a neuron in a look: on white, framed with its shadow. */
const keyOf = (spec: Spec) => (spec.look.white ? `${spec.id}/white` : spec.id);
const loading = new Map<string, Promise<Scene>>();

/** A moment when the page is idle — or, where it cannot say so, soon. */
const idle = () =>
  new Promise<void>((done) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => done(), { timeout: 600 });
    else setTimeout(done, 40);
  });

/** A neuron's scene in its look: fetched and built once, and kept. */
function sceneOf(spec: Spec): Promise<Scene> {
  const key = keyOf(spec);
  let pending = loading.get(key);
  if (!pending) {
    pending = loadNeuron(spec.id).then((n) =>
      Promise.all([
        loadMesh('root'),
        loadMesh(n.region),
        loadGlia('astrocyte'),
        loadGlia('microglia'),
        loadGlia('opc'),
      ]).then(([root, region, astro, micro, opc]) => {
        const sc = buildScene(root, region, rounded(n), spec, [astro, micro, opc]);
        scenes.set(key, sc);
        return sc;
      })
    );
    // a failure is not kept: the next figure tries again
    pending.catch(() => loading.delete(key));
    loading.set(key, pending);
  }
  return pending;
}

/* ------------------------------------------------------------- dendrogram */

/**
 * The neuron as a dendrogram on a w × th figure: where each node goes, px.
 * Each lies as far from the soma as its path there runs — the dendrites up,
 * the axon down — `k` px to the µm; across, each tip has a place of its own,
 * in the order its branches lie as seen from the angle it was laid out from,
 * and each fork sits midway over the branches it carries.
 */
interface Tree {
  key: string;
  tx: Float32Array;
  ty: Float32Array;
  k: number;
  /** How far apart its dendrites' tips are, px; and where the axon stops, at the figure's right. */
  step: number;
  right: number;
}

/**
 * The dendrogram runs left to right, the way signals go through the cell,
 * scaled for each neuron to fit the figure, all of it — the axon, often many
 * times as long as the dendrites, out to its furthest tip: how near its left
 * and right edges it may reach, px; how near the top and bottom its tips may
 * go; and how far apart they may be, at most. An axon shorter than TREE_LEAST
 * of the dendrites' reach, or none, still has that much room to the right.
 */
const TREE_LEFT = 28;
const TREE_RIGHT = 28;
const TREE_EDGE = 44;
const TREE_STEP = 30;
const TREE_LEAST = 0.5;
/** How much sooner the branches near the soma straighten out than the ones furthest from it, as a share of the turn. */
const TREE_STAGGER = 0.4;

/** How far into the dendrogram a node `d` µm from the soma has gone, `tree` of the way through the turn. */
const treeOf = (tree: number, d: number, longest: number) =>
  smooth(tree * (1 + TREE_STAGGER) - TREE_STAGGER * Math.min(1, d / longest));

function dendrogram(sc: Scene, yaw: number, w: number, th: number): Tree {
  const key = `${yaw.toFixed(4)}/${w}/${th}`;
  if (sc.tree?.key === key) return sc.tree;
  const { n, wx, wy, wz } = sc;
  const count = wx.length;
  const axonal = (i: number) => n.type[i] === 2;
  // each node's branches, of its own kind; and those that start a kind — the soma's own, and any axon off a dendrite
  const kids: number[][] = Array.from({ length: count }, () => []);
  const roots: number[] = [];
  for (let i = 1; i < count; i++) {
    const p = n.parent[i];
    if (p > 0 && axonal(p) === axonal(i)) kids[p].push(i);
    else roots.push(i);
  }
  // top to bottom as they lie: by how high each one's nodes are, on average, in the view
  const [ct, st, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(PITCH), Math.sin(PITCH)];
  const sum = new Float64Array(count);
  const num = new Float64Array(count);
  for (let i = count - 1; i >= 1; i--) {
    sum[i] += wy[i] * cp - (wx[i] * st + wz[i] * ct) * sp;
    num[i] += 1;
    const p = n.parent[i];
    if (p > 0 && axonal(p) === axonal(i)) {
      sum[p] += sum[i];
      num[p] += num[i];
    }
  }
  const down = (a: number, b: number) => sum[a] / num[a] - sum[b] / num[b];
  for (const list of kids) if (list.length > 1) list.sort(down);
  roots.sort(down);

  // the dendrites' longest path to the left of the soma, and the axon's to the right: the two together across the
  // figure, the axon's furthest tip just short of its edge — where only a cut axon's guessed run on gathers
  const reach = Math.max(1, n.dendritePath);
  const shows = Math.max(n.axonPath, TREE_LEAST * reach);
  const right = w - TREE_RIGHT;
  const k = (right - 2 - TREE_LEFT) / (reach + shows);
  const somaX = TREE_LEFT + reach * k;
  const slot = new Float32Array(count);
  const tx = new Float32Array(count);
  const ty = new Float32Array(count);
  const placed = new Uint8Array(count);
  /** One kind laid out: its tips a slot apart from 0, each fork midway between its first and last branches. */
  const lay = (axon: boolean) => {
    const order: number[] = [];
    const stack = roots.filter((r) => axonal(r) === axon).reverse();
    let tips = 0;
    while (stack.length) {
      const i = stack.pop()!;
      order.push(i);
      placed[i] = 1;
      const b = kids[i];
      if (!b.length) slot[i] = tips++;
      for (let j = b.length - 1; j >= 0; j--) stack.push(b[j]);
    }
    for (let o = order.length - 1; o >= 0; o--) {
      const b = kids[order[o]];
      if (b.length) slot[order[o]] = (slot[b[0]] + slot[b[b.length - 1]]) / 2;
    }
    return { order, tips };
  };
  const dend = lay(false);
  const axon = lay(true);

  const room = th - 2 * TREE_EDGE;
  const step = (tips: number) => Math.min(TREE_STEP, room / Math.max(1, tips - 1));
  const sd = step(dend.tips);
  const down0 = (at: number) => th / 2 + (at - (dend.tips - 1) / 2) * sd;
  // the soma level with the middle of its first and last dendrites, and the axon running on from it
  const first = dend.order.length ? dend.order[0] : 0;
  const lastRoot = roots.filter((r) => !axonal(r)).pop() ?? first;
  const somaY = dend.order.length ? down0((slot[first] + slot[lastRoot]) / 2) : th / 2;
  const sa = Math.min(sd, step(axon.tips));
  // the axon's branches fanned out level with the soma — as near as they can be while all of them fit
  const half = ((axon.tips - 1) / 2) * sa;
  const axonY = clamp(somaY, TREE_EDGE + half, th - TREE_EDGE - half);
  for (const i of dend.order) {
    tx[i] = somaX - n.dist[i] * k;
    ty[i] = down0(slot[i]);
  }
  // the axon, all of it, out towards the figure's edge
  for (const i of axon.order) {
    tx[i] = somaX + n.dist[i] * k;
    ty[i] = axonY + (slot[i] - (axon.tips - 1) / 2) * sa;
  }
  tx[0] = somaX;
  ty[0] = somaY;
  for (let i = 1; i < count; i++) {
    if (placed[i]) continue;
    tx[i] = Math.min(right, somaX + n.dist[i] * k);
    ty[i] = ty[n.parent[i]];
  }
  sc.tree = { key, tx, ty, k, step: sd, right };
  return sc.tree;
}

/**
 * An afferent on screen: as the view sees it; and turning, with the node it
 * ends on, into one that comes in from just beyond and to one side of that
 * node's branch in the dendrogram, and meets it square on — short and steep,
 * so as to cross none of the branches beside it.
 */
function leadOf(sc: Scene, a: Afferent, v: View, layout: Tree | null, tree: number): Pt[] {
  const seen = a.pts.map((p) => at(v, p));
  const contact = a.nodes[0];
  const e = layout ? treeOf(tree, sc.n.dist[contact], sc.n.dendritePath) : 0;
  if (!layout || e <= 0) return seen;
  const to = { x: layout.tx[contact], y: layout.ty[contact] };
  const side = to.y >= layout.ty[0] ? 1 : -1;
  const reach = clamp(to.x - 12, 16, 46);
  const from = { x: to.x - reach, y: to.y + side * clamp(0.45 * layout.step, 6, 13) };
  const last = a.d[a.d.length - 1];
  return seen.map((p, j) => {
    // in from beyond the branch's end of it, then curving across onto the branch
    const f = a.d[j] / last;
    const u = 1 - f;
    const qx = u * u * from.x + (2 * u * f + f * f) * to.x;
    const qy = (u * u + 2 * u * f) * from.y + f * f * to.y;
    return { x: p.x + (qx - p.x) * e, y: p.y + (qy - p.y) * e };
  });
}

/**
 * The way out along the axon, on screen, wherever the view and the dendrogram
 * have put its nodes; where a slice cut it short, the guess at the rest goes
 * on the way it was going — in the dendrogram, straight on to the right.
 */
function wayOut(sc: Scene, v: View, layout: Tree | null, tree: number): Pt[] {
  const { pts, d, cut } = sc.out;
  const nodes = sc.n.output.length ? sc.n.output : [0];
  const real = Math.min(nodes.length, pts.length);
  const end = nodes[real - 1];
  const e = layout ? treeOf(tree, sc.n.dist[end], sc.n.dendritePath) : 0;
  return pts.map((p, j) => {
    if (j < real) return { x: sc.sx[nodes[j]], y: sc.sy[nodes[j]] };
    const q = at(v, p);
    if (!layout || e <= 0) return q;
    const qx = Math.min(
      layout.right,
      layout.tx[end] + (d[j] - d[Math.min(cut, real - 1)]) * layout.k
    );
    const qy = layout.ty[end];
    return { x: q.x + (qx - q.x) * e, y: q.y + (qy - q.y) * e };
  });
}

/* ---------------------------------------------------------------- drawing */

/** Towards the light: on screen, and in the view's frame (right, down, away). */
const LX = -0.55;
const LY = -0.83;
const LIGHT: V3 = unit([-0.45, -0.75, -0.5], [0, 0, -1]);
const HALF: V3 = unit(add(LIGHT, [0, 0, -1]), [0, 0, -1]);
const WHITE: RGB = [255, 255, 255];

/**
 * The part of the page a figure may draw on, in the figure's own coordinates:
 * its box — or, spilling over the page, the whole window about it. Set each
 * frame before drawing; what falls outside it is skipped.
 */
const seen = { x0: 0, y0: 0, x1: 0, y1: 0, spill: false };
const outside = (x: number, y: number, pad: number) =>
  x < seen.x0 - pad || x > seen.x1 + pad || y < seen.y0 - pad || y > seen.y1 + pad;

/** How far under the words above the figure the line is that it fades out above; and over how far it fades, px. */
const FADE_UNDER = 28;
const FADE_FOR = 56;

/**
 * Spilling over the page, the figure clears itself above a line just under the
 * words over it — the slide's own, whatever comes before the figure on the
 * page — fading out to nothing over FADE_FOR px, so the page shows through.
 */
function fadeAbove(ctx: CanvasRenderingContext2D, box: DOMRect, frame: HTMLElement | null) {
  const words = frame?.parentElement?.previousElementSibling;
  const line =
    (words ? words.getBoundingClientRect().bottom : box.top - FADE_UNDER) + FADE_UNDER - box.top;
  const width = seen.x1 - seen.x0;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.fillRect(seen.x0, seen.y0, width, Math.max(0, line - FADE_FOR - seen.y0));
  const fade = ctx.createLinearGradient(0, line - FADE_FOR, 0, line);
  fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fade;
  ctx.fillRect(seen.x0, line - FADE_FOR, width, FADE_FOR);
  ctx.restore();
}

/** How far over the slides' navigator at the page's foot the figure stops, px; and over how far it fades out there. */
const FOOT_OVER = 6;
const FOOT_FOR = 48;

/**
 * And, as over the words, clear below a line just over the navigator at the
 * page's foot — whatever follows the page's middle — fading out over FOOT_FOR
 * px, so the slides' dots and arrows stand on the page alone.
 */
function fadeBelow(ctx: CanvasRenderingContext2D, box: DOMRect, frame: HTMLElement | null) {
  const foot = frame?.closest('main')?.nextElementSibling;
  if (!foot) return;
  const line = foot.getBoundingClientRect().top - FOOT_OVER - box.top;
  const width = seen.x1 - seen.x0;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.fillRect(seen.x0, line, width, Math.max(0, seen.y1 - line));
  const fade = ctx.createLinearGradient(0, line - FOOT_FOR, 0, line);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = fade;
  ctx.fillRect(seen.x0, line - FOOT_FOR, width, FOOT_FOR);
  ctx.restore();
}

/**
 * The first slide's brains, in a row: a fruit fly's, the mouse's and a human's
 * — the fly's FlyWire's whole-brain mesh, the human's the Julich-Brain
 * atlas's — each with roughly how many neurons it has, a bar of the length
 * given, µm, for its true size, and whose mesh it is; and, for the fly's and
 * the human's, the angle it starts from — the fly's from in front, where it is
 * widest, the human's from its side and a little in front — and how fast it
 * turns from there, rad/s, each its own way: the mouse's turns as the figure's
 * own brain does.
 */
const KIN: {
  mesh?: string;
  name: string;
  neurons: string;
  bar: number;
  credit: string;
  yaw: number;
  spin: number;
}[] = [
  {
    mesh: 'fly',
    name: 'Fruit fly',
    neurons: '~140,000 neurons',
    bar: 200,
    credit: 'FlyWire (Dorkenwald et al., 2024)',
    yaw: -Math.PI / 2,
    spin: 0.14,
  },
  {
    name: 'Mouse',
    neurons: '~70 million neurons',
    bar: 5000,
    credit: 'Allen Mouse Brain CCFv3',
    yaw: 0,
    spin: 0,
  },
  {
    mesh: 'human',
    name: 'Human',
    neurons: '~86 billion neurons',
    bar: 50000,
    credit: 'Julich-Brain (Amunts et al., 2020)',
    yaw: 0.45,
    spin: -0.07,
  },
];
/** The fly's and the human's meshes once loaded, each with its middle and its reach all the way round. */
const kin: Record<string, { mesh: Mesh; centre: V3; ext: Ext }> = {};
function loadKin() {
  for (const { mesh: name } of KIN)
    if (name && !kin[name])
      loadMesh(name).then((mesh) => {
        const centre = centreOf(mesh.v);
        kin[name] = { mesh, centre, ext: extent(mesh.v, centre, ROUND) };
      });
}
/** How much of the figure's foot the row's labels take, px. */
const TRIO_LABELS = 82;
/** The row's `i`th place: its middle, and the room in it for a brain. */
function trioSlot(i: number, w: number, th: number) {
  return {
    x: (w / 3) * (i + 0.5),
    y: (th - TRIO_LABELS) / 2 + 6,
    w: w / 3 - 40,
    h: th - TRIO_LABELS - 28,
  };
}
/** Whose place a point `x` px across the row, `w` px wide, is in. */
const trioAt = (x: number, w: number) => clamp(Math.floor((3 * x) / Math.max(1, w)), 0, 2);
/** A turn and a tilt by hand, radians. */
type Turn = { yaw: number; tilt: number };
/** As big as a brain can be in its place, turned whichever way. */
const trioScale = (ext: Ext, slot: ReturnType<typeof trioSlot>) =>
  Math.min(slot.w / 2 / ext.hr, slot.h / 2 / ext.hy);
const barText = (um: number) =>
  um >= 10000 ? `${um / 10000} cm` : um >= 1000 ? `${um / 1000} mm` : `${um} µm`;

/**
 * The first slide's row, `pose.trio` of it: the fly's brain and the human's
 * beside the mouse's — which the figure draws itself, where `pose` has it —
 * each turning its own way, `now` ms in — and as its own of `hands` turns it — a soft shadow under it; and under
 * each, its name, about how many neurons it has, a bar for its size, and whose
 * mesh it is.
 */
function drawTrio(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  look: Look,
  w: number,
  th: number,
  now: number,
  hands: Turn[]
) {
  const a = pose.trio * pose.brain;
  if (a < 0.01) return;
  const white = !!look.white;
  KIN.forEach((one, i) => {
    const slot = trioSlot(i, w, th);
    const it = one.mesh ? kin[one.mesh] : null;
    let s = pose.s;
    if (one.mesh) {
      if (!it) return;
      s = trioScale(it.ext, slot);
      const hand = hands[i] ?? { yaw: 0, tilt: 0 };
      const v = view(
        one.yaw + (one.spin * now) / 1000 + hand.yaw,
        s,
        it.centre,
        slot.x,
        slot.y,
        PITCH + hand.tilt
      );
      if (white)
        soften(ctx, 0.16 * a, 10, (g) => {
          g.beginPath();
          g.ellipse(slot.x, slot.y + it.ext.hy * s + 10, it.ext.hr * s * 0.8, 7, 0, 0, Math.PI * 2);
          g.fill();
        });
      drawLayers(
        ctx,
        v,
        [{ mesh: it.mesh, tint: brainGlass(look), strength: 0.75 * a }],
        white,
        w,
        th
      );
    }
    // its name, how many neurons, a bar as long as `bar` µm is at the scale it is drawn, and whose mesh it is
    const y = th - TRIO_LABELS + 10;
    tag(ctx, one.name, slot.x, y, look.text, null, a, 14, 'center');
    tag(ctx, one.neurons, slot.x, y + 18, look.text, null, 0.75 * a, 12, 'center');
    const len = one.bar * s;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(look.text, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(slot.x - len / 2, y + 40);
    ctx.lineTo(slot.x + len / 2, y + 40);
    ctx.stroke();
    ctx.restore();
    tag(ctx, barText(one.bar), slot.x + len / 2 + 6, y + 40, look.text, null, 0.65 * a, 10.5);
    tag(ctx, one.credit, slot.x, y + 58, look.text, null, 0.6 * a, 10.5, 'center');
  });
}

/** Hold what is drawn to the figure's box — unless it spills over the page. */
function clipToBox(ctx: CanvasRenderingContext2D, w: number, th: number) {
  if (seen.spill) return;
  ctx.beginPath();
  ctx.rect(0, 0, w, th);
  ctx.clip();
}

/** Where the field is, and the scale that fits something into it. */
function frameOf(w: number, th: number) {
  return {
    cx: w / 2,
    cy: th / 2,
    fit: (e: Ext, padX: number, padY: number) =>
      Math.min((w / 2 - padX) / e.hx, (th / 2 - padY) / e.hy),
  };
}

/** The fluid: deep at the edges, with slow light drifting through it. */
function fluid(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, now: number) {
  // spilling over the page, the page itself is the ground
  if (seen.spill) return;
  if (look.white) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const g = ctx.createRadialGradient(
    w / 2,
    h * 0.45,
    h * 0.05,
    w / 2,
    h * 0.45,
    Math.max(w, h) * 0.75
  );
  g.addColorStop(0, rgba(look.bg[0], 1));
  g.addColorStop(1, rgba(look.bg[1], 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < 3; k++) {
    const x = w * (0.25 + 0.25 * k + 0.08 * Math.sin(now / 5200 + k * 2.1));
    const y = h * (0.4 + 0.15 * Math.cos(now / 6100 + k * 1.3));
    const r = h * (0.55 + 0.1 * k);
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, rgba(mix(look.bg[0], look.glass, 0.25), 0.18));
    blob.addColorStop(1, rgba(look.bg[0], 0));
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Soft discs to draw light and specks with, one per colour and kind, made once. */
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(colour: RGB, kind: 'glow' | 'blob' | 'speck') {
  const key = `${kind}:${colour.join()}`;
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g2 = c.getContext('2d')!;
    const g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (kind === 'glow') {
      g.addColorStop(0, rgba(mix(colour, WHITE, 0.6), 1));
      g.addColorStop(0.25, rgba(colour, 0.7));
      g.addColorStop(1, rgba(colour, 0));
    } else if (kind === 'blob') {
      // on white: a wash of the colour itself, there being no light to add
      g.addColorStop(0, rgba(colour, 0.95));
      g.addColorStop(0.22, rgba(colour, 0.7));
      g.addColorStop(0.55, rgba(colour, 0.22));
      g.addColorStop(1, rgba(colour, 0));
    } else {
      // out of focus, a speck is a disc with a brighter rim
      g.addColorStop(0, rgba(colour, 0.5));
      g.addColorStop(0.7, rgba(colour, 0.42));
      g.addColorStop(0.88, rgba(colour, 0.62));
      g.addColorStop(1, rgba(colour, 0));
    }
    g2.fillStyle = g;
    g2.fillRect(0, 0, 64, 64);
    sprites.set(key, c);
  }
  return c;
}

function glowAt(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  r: number,
  colour: RGB,
  alpha: number,
  white = false
) {
  if (alpha < 0.01 || r < 0.5) return;
  ctx.save();
  if (!white) ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, white ? 0.85 * alpha : alpha);
  ctx.drawImage(sprite(colour, white ? 'blob' : 'glow'), p.x - r, p.y - r, 2 * r, 2 * r);
  ctx.restore();
}

/* shadows, for a cell floating on white: cast straight down onto a floor beneath it, and softened */

const SHADOW: RGB = [22, 30, 48];
let shadowCanvas: HTMLCanvasElement | null = null;

/**
 * Lay what `paint` draws, in black on a canvas of its own, onto the figure as a
 * soft shadow `blur` px across and `alpha` deep. The softening is the canvas's
 * own shadow, cast from the drawing set off to one side, which every browser
 * blurs.
 */
function soften(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  blur: number,
  paint: (g: CanvasRenderingContext2D) => void
) {
  if (alpha < 0.01) return;
  const { width, height } = ctx.canvas;
  shadowCanvas ??= document.createElement('canvas');
  if (shadowCanvas.width !== width || shadowCanvas.height !== height) {
    shadowCanvas.width = width;
    shadowCanvas.height = height;
  }
  const g = shadowCanvas.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, width, height);
  g.setTransform(ctx.getTransform());
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  g.lineCap = 'round';
  paint(g);
  const dpr = ctx.getTransform().a;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowColor = rgba(SHADOW, alpha);
  ctx.shadowBlur = blur * dpr;
  ctx.shadowOffsetX = width + 64;
  ctx.drawImage(shadowCanvas, -width - 64, 0);
  ctx.restore();
}

/** The brain's shadow: its footprint, on the floor beneath it — `go` µm along, if the mouse round it has walked it there. */
function brainShadow(ctx: CanvasRenderingContext2D, sc: Scene, v: View, alpha: number, go = 0) {
  const fl = sc.floors;
  if (!fl) return;
  soften(ctx, 0.2 * alpha, clamp(700 * v.s, 6, 40), (g) => {
    g.beginPath();
    for (let k = 0; k < fl.hull.length; k += 2) {
      const p = at(v, [fl.hull[k] + go, fl.brain, fl.hull[k + 1]]);
      if (k) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    }
    g.closePath();
    g.fill();
  });
}

/** The cell's shadow: each branch as it falls on the floor beneath, softer the higher the cell floats; and a faint pool under it all. */
function cellShadow(ctx: CanvasRenderingContext2D, sc: Scene, v: View, x: number, alpha: number) {
  const fl = sc.floors;
  if (!fl || alpha < 0.01) return;
  const { c, ct, st, cp, sp, cr, sr, s, ox, oy } = v;
  const fy = (fl.cell - c[1]) * cp;
  const across = (a: number, m: number) => (a - c[0]) * ct - (m - c[2]) * st;
  const down = (a: number, m: number) => fy - ((a - c[0]) * st + (m - c[2]) * ct) * sp;
  const X = (a: number, m: number) => ox + s * (across(a, m) * cr - down(a, m) * sr);
  const Y = (a: number, m: number) => oy + s * (across(a, m) * sr + down(a, m) * cr);

  const o = { x: X(sc.centre[0], sc.centre[2]), y: Y(sc.centre[0], sc.centre[2]) };
  const r = sc.reach * s;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(Math.atan2(sr, cr));
  ctx.scale(1, Math.max(0.15, sp));
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  pool.addColorStop(0, rgba(SHADOW, 0.09 * alpha));
  pool.addColorStop(1, rgba(SHADOW, 0));
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  soften(ctx, 0.3 * alpha, clamp(0.1 * fl.above * s, 3, 16), (g) => {
    const groups: number[][] = [[], [], [], []];
    for (let j = 0; j < fl.foot.length; j += 5) {
      const w = fl.foot[j + 4] * x * s;
      groups[w < 1.8 ? 0 : w < 3.4 ? 1 : w < 6 ? 2 : 3].push(
        X(fl.foot[j], fl.foot[j + 1]),
        Y(fl.foot[j], fl.foot[j + 1]),
        X(fl.foot[j + 2], fl.foot[j + 3]),
        Y(fl.foot[j + 2], fl.foot[j + 3])
      );
    }
    groups.forEach((group, k) => {
      if (!group.length) return;
      g.lineWidth = [1.2, 2.4, 4.5, 8][k];
      g.beginPath();
      for (let j = 0; j < group.length; j += 4) {
        g.moveTo(group[j], group[j + 1]);
        g.lineTo(group[j + 2], group[j + 3]);
      }
      g.stroke();
    });
    const rs = sc.somaR * x * s * 1.1;
    g.beginPath();
    g.ellipse(
      X(sc.soma[0], sc.soma[2]),
      Y(sc.soma[0], sc.soma[2]),
      rs,
      rs * 0.6,
      0,
      0,
      Math.PI * 2
    );
    g.fill();
  });
}

/* the brain, as glass: bright where its surface turns edge-on to the eye, with a glint where it catches the light */

/** The brain and its region as glass: in WebGL, shaded smoothly pixel by pixel; without it, triangle by triangle here. */
function drawBrain(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  v: View,
  look: Look,
  brain: number,
  region: number,
  w: number,
  th: number
) {
  drawLayers(
    ctx,
    v,
    [
      { mesh: sc.root, tint: brainGlass(look), strength: brain },
      { mesh: sc.region, tint: look.cell, strength: region },
    ],
    !!look.white,
    w,
    th
  );
}

/** Surfaces as glass, each in its own tint and strength: in WebGL if it can, triangle by triangle here if not. */
function drawLayers(
  ctx: CanvasRenderingContext2D,
  v: View,
  layers: GlassLayer[],
  white: boolean,
  w: number,
  th: number
) {
  const live = layers.filter((l) => l.strength >= 0.01);
  if (!live.length) return;
  // drawn into a canvas of its own and laid over this one as it is, so moved by however far the figure has been
  const m = ctx.getTransform();
  const moved = { ...v, ox: v.ox + m.e / m.a, oy: v.oy + m.f / m.a };
  const glass = renderGlass(ctx.canvas.width, ctx.canvas.height, m.a, moved, HALF, live, white);
  if (glass) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!white) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glass, 0, 0);
    ctx.restore();
    return;
  }
  for (const l of live) drawGlass(ctx, l.mesh, v, l.tint, l.strength, w, th, white);
}

const GLASS_LEVELS = 20;
const glassLevels: number[][] = Array.from({ length: GLASS_LEVELS }, () => []);
const glassScratch = new WeakMap<Mesh, Float32Array[]>();

/** The same glass without WebGL: the smoothed surface's triangles, each filled with its corners' mean brightness. */
function drawGlass(
  ctx: CanvasRenderingContext2D,
  m: Mesh,
  v: View,
  tint: RGB,
  strength: number,
  w: number,
  th: number,
  white: boolean
) {
  if (strength < 0.01) return;
  const { v: pts, n: normals, f: faces } = surface(m, false);
  const count = pts.length / 3;
  let scratch = glassScratch.get(m);
  if (!scratch) {
    scratch = Array.from({ length: 3 }, () => new Float32Array(count));
    glassScratch.set(m, scratch);
  }
  const [px, py, lum] = scratch;
  const { c, ct, st, cp, sp, cr, sr, s, ox, oy } = v;
  for (let i = 0; i < count; i++) {
    const qa = pts[i * 3] - c[0];
    const qd = pts[i * 3 + 1] - c[1];
    const qm = pts[i * 3 + 2] - c[2];
    const z1 = qa * st + qm * ct;
    const x = qa * ct - qm * st;
    const y = qd * cp - z1 * sp;
    px[i] = ox + s * (x * cr - y * sr);
    py[i] = oy + s * (x * sr + y * cr);
    const na = normals[i * 3];
    const nd = normals[i * 3 + 1];
    const nm = normals[i * 3 + 2];
    const n1 = na * st + nm * ct;
    const n0 = na * ct - nm * st;
    const n2 = nd * cp - n1 * sp;
    const nx = n0 * cr - n2 * sr;
    const ny = n0 * sr + n2 * cr;
    const nz = nd * sp + n1 * cp;
    const glint = Math.abs(nx * HALF[0] + ny * HALF[1] + nz * HALF[2]) ** 40;
    lum[i] = white
      ? 0.025 + 0.5 * (1 - Math.abs(nz)) ** 1.6
      : 0.03 + 0.7 * (1 - Math.abs(nz)) ** 2.4 + (nz < 0 ? 0.8 : 0.25) * glint;
  }
  for (const l of glassLevels) l.length = 0;
  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f];
    const b = faces[f + 1];
    const d = faces[f + 2];
    if (Math.max(px[a], px[b], px[d]) < seen.x0 || Math.min(px[a], px[b], px[d]) > seen.x1)
      continue;
    if (Math.max(py[a], py[b], py[d]) < seen.y0 || Math.min(py[a], py[b], py[d]) > seen.y1)
      continue;
    const bright = Math.min(1, ((lum[a] + lum[b] + lum[d]) / 3) * strength);
    if (bright < 0.015) continue;
    glassLevels[Math.min(GLASS_LEVELS - 1, Math.floor(bright * GLASS_LEVELS))].push(
      px[a],
      py[a],
      px[b],
      py[b],
      px[d],
      py[d]
    );
  }
  ctx.save();
  if (!white) ctx.globalCompositeOperation = 'lighter';
  glassLevels.forEach((l, k) => {
    if (!l.length) return;
    ctx.fillStyle = rgba(tint, (k + 0.5) / GLASS_LEVELS);
    ctx.beginPath();
    for (let j = 0; j < l.length; j += 6) {
      ctx.moveTo(l[j], l[j + 1]);
      ctx.lineTo(l[j + 2], l[j + 3]);
      ctx.lineTo(l[j + 4], l[j + 5]);
      ctx.closePath();
    }
    ctx.fill();
  });
  ctx.restore();
}

/** Specks adrift around the cell, blurred the further they are from the plane in focus. */
function drawMotes(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  v: View,
  look: Look,
  alpha: number,
  front: boolean,
  focus: number
) {
  if (alpha < 0.01 || look.white) return;
  const img = sprite(look.mote, 'speck');
  const somaZ = sc.sz[0];
  ctx.save();
  for (let j = 0; j < sc.motes.length; j += 4) {
    const p: V3 = [sc.motes[j], sc.motes[j + 1], sc.motes[j + 2]];
    const t = turn(v, sub(p, v.c));
    if (t[2] < somaZ !== front) continue;
    const blur = clamp01(Math.abs(t[2] - somaZ) / focus);
    const r = Math.max(0.8, sc.motes[j + 3] * v.s) + blur * 16;
    const x = v.ox + v.s * t[0];
    const y = v.oy + v.s * t[1];
    if (outside(x, y, r)) continue;
    ctx.globalAlpha = alpha * (front ? 0.22 : 0.4) * (1 - 0.6 * blur);
    ctx.drawImage(img, x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
}

/* the neuron: tubes, sorted into depth slabs drawn back to front, each tube in passes —
   a faint glow, its shaded edge, its lit core, and a streak of shine along the side facing the light */

const SLABS = 8;
/** One more slab, behind all the others: the blood vessel's, so it lies at the back of everything. */
const BACK = SLABS;
const FAMILIES = 10; // dendrites, efferent axon, afferent axons; then the other cells (see OTHERS)
const PASSES = 7; // glow, shade, thin body, core, and three strengths of shine
const WIDTHS = 72; // quarter pixels, to 18 px
const tubes: number[][] = Array.from(
  { length: (SLABS + 1) * FAMILIES * PASSES * WIDTHS },
  () => []
);
const necks: number[][] = Array.from({ length: SLABS + 1 }, () => []);
const knobs: number[][] = Array.from({ length: (SLABS + 1) * FAMILIES }, () => []);
/** The picked-out parts' branches on screen, for their halos — dendrites, and axon: [x0, y0, x1, y1] each. */
const glowSegs: number[] = [];
const glowAxon: number[] = [];
const bin = (slab: number, family: number, pass: number, wi: number) =>
  tubes[((slab * FAMILIES + family) * PASSES + pass) * WIDTHS + wi];

/** A branch from (x0, y0) to (x1, y1), `w` px wide, its lit core leaning `lean` of the way towards the light (none, when flat). */
function addTube(
  slab: number,
  family: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  lean = 1
) {
  const wi = Math.max(2, Math.min(WIDTHS - 1, Math.round(w * 4)));
  bin(slab, family, 0, wi).push(x0, y0, x1, y1);
  if (w < 1.2) {
    bin(slab, family, 2, wi).push(x0, y0, x1, y1);
    return;
  }
  const thin = w < 2.2;
  bin(slab, family, thin ? 2 : 1, wi).push(x0, y0, x1, y1);
  let dx = x1 - x0;
  let dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  let nx = -dy;
  let ny = dx;
  if (nx * LX + ny * LY < 0) {
    nx = -nx;
    ny = -ny;
  }
  const facing = nx * LX + ny * LY;
  const core = 0.1 * w * lean;
  const shine = 0.24 * w;
  if (!thin)
    bin(slab, family, 3, wi).push(x0 + nx * core, y0 + ny * core, x1 + nx * core, y1 + ny * core);
  bin(slab, family, 4 + Math.min(2, Math.floor(facing * 3)), wi).push(
    x0 + nx * shine,
    y0 + ny * shine,
    x1 + nx * shine,
    y1 + ny * shine
  );
}

function strokeSlab(
  ctx: CanvasRenderingContext2D,
  slab: number,
  colours: RGB[],
  alpha: number,
  widen: number,
  white: boolean,
  shown: number[],
  flat = 0
) {
  const neck = necks[slab];
  if (neck.length && alpha * shown[0] > 0.01) {
    // spines: a neck and a head, under the dendrites they stand on
    ctx.strokeStyle = rgba(mix(colours[0], [0, 0, 0], 0.35), 0.75 * alpha * shown[0]);
    ctx.fillStyle = rgba(colours[0], alpha * shown[0]);
    ctx.lineWidth = Math.max(0.5, neck[4] * 0.6);
    ctx.beginPath();
    for (let j = 0; j < neck.length; j += 5) {
      ctx.moveTo(neck[j], neck[j + 1]);
      ctx.lineTo(neck[j + 2], neck[j + 3]);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let j = 0; j < neck.length; j += 5) {
      ctx.moveTo(neck[j + 2] + neck[j + 4], neck[j + 3]);
      ctx.arc(neck[j + 2], neck[j + 3], neck[j + 4], 0, Math.PI * 2);
    }
    ctx.fill();
  }
  for (let family = 0; family < FAMILIES; family++) {
    const a = alpha * shown[family];
    if (a < 0.01) continue;
    const c = colours[family];
    // pressed flat, no shading or shine: an even colour, edge to edge — an outline would swell into a border as the
    // view draws in on a branch
    const shade = mix(c, [0, 0, 0], 0.58 * (1 - flat));
    const shine = mix(c, WHITE, 0.8);
    const glint = 1 - flat;
    for (let pass = 0; pass < PASSES; pass++) {
      // flat, the shade under the core is the core's own colour already: no core over it, to show through when faint
      if (pass === 3 && flat > 0.99) continue;
      for (let wi = 0; wi < WIDTHS; wi++) {
        const b = bin(slab, family, pass, wi);
        if (!b.length || (white && pass === 0)) continue;
        const w = wi / 4 + widen;
        if (pass === 0) {
          ctx.lineWidth = w + 3;
          ctx.strokeStyle = rgba(c, 0.08 * a);
        } else if (pass === 1) {
          ctx.lineWidth = w;
          ctx.strokeStyle = rgba(shade, a);
        } else if (pass === 2) {
          ctx.lineWidth = w;
          ctx.strokeStyle = rgba(c, a);
        } else if (pass === 3) {
          ctx.lineWidth = w * 0.64;
          ctx.strokeStyle = rgba(c, a);
        } else {
          if (glint < 0.01) continue;
          ctx.lineWidth = Math.max(0.6, w * 0.2);
          ctx.strokeStyle = rgba(shine, (0.25 + 0.27 * (pass - 4)) * a * glint);
        }
        ctx.beginPath();
        for (let j = 0; j < b.length; j += 4) {
          ctx.moveTo(b[j], b[j + 1]);
          ctx.lineTo(b[j + 2], b[j + 3]);
        }
        ctx.stroke();
      }
    }
    // swellings and boutons: little spheres, lit from the upper left
    const k = knobs[slab * FAMILIES + family];
    if (!k.length) continue;
    ctx.fillStyle = rgba(c, a);
    ctx.beginPath();
    for (let j = 0; j < k.length; j += 3) {
      ctx.moveTo(k[j] + k[j + 2], k[j + 1]);
      ctx.arc(k[j], k[j + 1], k[j + 2], 0, Math.PI * 2);
    }
    ctx.fill();
    if (glint < 0.01) continue;
    ctx.fillStyle = rgba(shine, 0.75 * a * glint);
    ctx.beginPath();
    for (let j = 0; j < k.length; j += 3) {
      if (k[j + 2] < 1.2) continue;
      const r = k[j + 2] * 0.35;
      ctx.moveTo(k[j] - k[j + 2] * 0.3 + r, k[j + 1] - k[j + 2] * 0.35);
      ctx.arc(k[j] - k[j + 2] * 0.3, k[j + 1] - k[j + 2] * 0.35, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

/* the soma: its mesh's triangles that face the viewer, shaded and painted back to front */

const somaRadii = new Float32Array(642);
const somaV = Array.from({ length: 5 }, () => new Float32Array(642));
const somaFaces: { z: number; colour: string; i: number }[] = [];

/**
 * The soma — in its own colour, apart from its dendrites' — as its mesh, shaded;
 * and, `tree` of the way into the dendrogram, carried to the root there and
 * turning into a flat disc.
 */
function drawSoma(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  v: View,
  look: Look,
  x: number,
  alpha: number,
  glow: number,
  halo = 0,
  tree = 0
) {
  if (alpha <= 0) return;
  const r = sc.somaR * x * v.s;
  const centre = { x: sc.sx[0], y: sc.sy[0] };
  const disc = treeOf(tree, 0, 1);
  const white = !!look.white;
  const colour = look.soma;
  // picked out: a halo behind it that swells and fades
  if (halo > 0.01)
    glowAt(ctx, centre, Math.max(12, r * 2.4) + 16 * halo, colour, 0.7 * halo, white);
  if (r < 3) {
    // on white the glow goes behind the soma, a wash of colour; on dark, light added over it
    if (white) glowAt(ctx, centre, 7 + 10 * glow, colour, 0.3 * alpha + 0.6 * glow, true);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, Math.max(1.6, r), 0, Math.PI * 2);
    ctx.fillStyle = rgba(colour, 1);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (!white) glowAt(ctx, centre, 7 + 10 * glow, colour, 0.5 * alpha + glow);
    return;
  }
  if (white && glow > 0.01)
    glowAt(ctx, centre, Math.min(r * (2.2 + 1.5 * glow), r + 36), colour, 0.6 * glow, true);
  const m = sc.somaMesh;
  radiiAt(m, x, somaRadii);
  const [vx, vy, vz, px, py] = somaV;
  const count = m.dirs.length / 3;
  for (let j = 0; j < count; j++) {
    const p: V3 = [
      sc.soma[0] + m.dirs[j * 3] * somaRadii[j],
      sc.soma[1] + m.dirs[j * 3 + 1] * somaRadii[j],
      sc.soma[2] + m.dirs[j * 3 + 2] * somaRadii[j],
    ];
    const t = turn(v, sub(p, v.c));
    vx[j] = t[0];
    vy[j] = t[1];
    vz[j] = t[2];
    px[j] = v.ox + v.s * t[0] + sc.mx[0];
    py[j] = v.oy + v.s * t[1] + sc.my[0];
  }
  const sheen = mix(colour, WHITE, 0.45);
  somaFaces.length = 0;
  for (let f = 0; f < m.faces.length; f += 3) {
    const a = m.faces[f];
    const b = m.faces[f + 1];
    const d = m.faces[f + 2];
    const e1 = [vx[b] - vx[a], vy[b] - vy[a], vz[b] - vz[a]];
    const e2 = [vx[d] - vx[a], vy[d] - vy[a], vz[d] - vz[a]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    if (nz >= 0) continue;
    // on white, more light all round, as from a bright room, so the soma matches its branches
    const ambient = white ? 0.42 : 0.22;
    const lit =
      ambient + (1 - ambient) * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const h = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
    // a hard glint and a broad wet sheen, and the rim lit from within
    const spec = 255 * (0.9 * h ** 28 + 0.12 * h ** 6);
    const rim = 0.45 * (1 - Math.abs(nz)) ** 2.5;
    // its edge lit from within against the dark; on white, darkening, as a wet surface's does against a bright ground —
    // and going into the dendrogram, one even colour, as a drawing's
    const rgb = [0, 1, 2].map((k) => {
      const shaded = white
        ? (colour[k] * lit + spec) * (1 - 0.45 * rim) + sheen[k] * glow * 0.35
        : colour[k] * lit + spec + sheen[k] * rim + sheen[k] * glow * 0.6;
      return Math.min(255, Math.round(lerp(shaded, colour[k] + sheen[k] * glow * 0.35, tree)));
    });
    somaFaces.push({
      z: vz[a] + vz[b] + vz[d],
      colour: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
      i: f,
    });
  }
  somaFaces.sort((p, q) => q.z - p.z);
  ctx.globalAlpha = alpha * (1 - disc);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.6;
  for (const face of somaFaces) {
    const [a, b, d] = [m.faces[face.i], m.faces[face.i + 1], m.faces[face.i + 2]];
    ctx.fillStyle = face.colour;
    ctx.strokeStyle = face.colour;
    ctx.beginPath();
    ctx.moveTo(px[a], py[a]);
    ctx.lineTo(px[b], py[b]);
    ctx.lineTo(px[d], py[d]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (disc > 0.01) {
    // the dendrogram's root: a disc, an even colour as its branches are
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, clamp(r, 5, 12), 0, Math.PI * 2);
    ctx.fillStyle = rgba(colour, alpha * disc);
    ctx.fill();
  }
  if (!white && glow > 0.01)
    glowAt(ctx, centre, Math.min(r * (2.2 + 1.5 * glow), r + 36), colour, glow);
}

/**
 * The neuron's nodes onto the screen as `v` sees them, and how deep each is;
 * then, `tree` of the way into the dendrogram `layout`, carried on towards
 * their places there — and how far each was carried.
 */
function project(sc: Scene, v: View, layout: Tree | null, tree: number) {
  const { n, wx, wy, wz, sx, sy, sz, mx, my } = sc;
  const { c, ct, st, cp, sp, cr, sr, s, ox, oy } = v;
  for (let i = 0; i < wx.length; i++) {
    const qa = wx[i] - c[0];
    const qd = wy[i] - c[1];
    const qm = wz[i] - c[2];
    const z1 = qa * st + qm * ct;
    const x = qa * ct - qm * st;
    const y = qd * cp - z1 * sp;
    sx[i] = ox + s * (x * cr - y * sr);
    sy[i] = oy + s * (x * sr + y * cr);
    sz[i] = qd * sp + z1 * cp;
    mx[i] = 0;
    my[i] = 0;
    if (!layout || tree <= 0) continue;
    const e = treeOf(tree, n.dist[i], n.dendritePath);
    mx[i] = (layout.tx[i] - sx[i]) * e;
    my[i] = (layout.ty[i] - sy[i]) * e;
    sx[i] += mx[i];
    sy[i] += my[i];
  }
}

interface Paint {
  /** How far the light has spread along the dendrites and the axon (0 to 1). */
  dend: number;
  axon: number;
  somaAlpha: number;
  somaGlow: number;
  /** How much of each afferent is drawn, on the signals slide; and how strongly. */
  aff: number[] | null;
  affAlpha?: number;
  /** How much of the neuron itself to show, and of the other cells around it (0 to 1). */
  cell?: number;
  crowd?: number;
  /** How strongly each part of it is picked out (0 to 1) — the rest faded back — and where in its beat the pulse is. */
  lit?: Record<Part, number>;
  pulse?: number;
  /** How much of the red blood cells in the vessel to show, on top of `crowd` (0 to 1). */
  redCells?: number;
  /** The stage's clock, ms: what the dendrites' sparkles and the axon's spikes keep time to. */
  time?: number;
  /** How much of each node's segment to draw (0 to 1), where some are drawn back. */
  cut?: ((i: number) => number) | null;
  /**
   * How far it has turned into a dendrogram, laid out as `layout` (0 to 1):
   * flat once it has, its shading, shine and blur gone with its depth.
   */
  tree?: number;
  layout?: Tree | null;
}

const UNLIT: Record<Part, number> = { dendrites: 0, axon: 0, soma: 0 };

function drawNeuron(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  v: View,
  look: Look,
  paint: Paint,
  w: number,
  th: number
) {
  const { n, wx, sx, sy, sz, mx, my, diam } = sc;
  const { c, s, ox, oy } = v;
  const x = exaggerate(s);
  const layout = paint.layout ?? null;
  const flat = layout ? (paint.tree ?? 0) : 0;
  const lean = 1 - flat;
  // its layers keep the order they had in depth, dendrogram or not
  project(sc, v, layout, flat);
  const somaZ = sz[0];
  const thick = Math.max(8, sc.reach * 0.3);
  const slabOf = (z: number) =>
    Math.max(0, Math.min(SLABS - 1, Math.floor((z - somaZ) / thick) + SLABS / 2));
  const off = (x0: number, y0: number, x1: number, y1: number, pad: number) =>
    (x0 < seen.x0 - pad && x1 < seen.x0 - pad) ||
    (x0 > seen.x1 + pad && x1 > seen.x1 + pad) ||
    (y0 < seen.y0 - pad && y1 < seen.y0 - pad) ||
    (y0 > seen.y1 + pad && y1 > seen.y1 + pad);
  for (const b of tubes) b.length = 0;
  for (const b of necks) b.length = 0;
  for (const b of knobs) b.length = 0;

  const dLim = paint.dend * n.dendritePath * 1.001;
  const aLim = paint.axon * n.axonPath * 1.001;
  // what lies inside the soma is hidden by it — except in the dendrogram, where it is the bar the branches stand on:
  // shown almost as soon as the turn into the dendrogram starts, so the stems stretch out with the branches on them
  const inside = sc.somaR * x * 0.95 * (1 - smooth(clamp01(flat * 8)));
  // how far closer in the view is than the tissue round the soma, 0 to 1: so close, the view itself picks out what
  // it is on, and the rest is drawn solid — see-through, a branch shows a ring wherever two of its segments overlap
  const close = clamp01(Math.log(s / ((th / 2 - 24) / TISSUE)) / Math.LN2);
  // the parts picked out, if any: their branches gathered for a halo, the rest of the cell faded
  const lit = paint.lit ?? UNLIT;
  const beat = paint.pulse ?? 0;
  const faded = (part: Part) => {
    const others = clamp01(
      (Object.keys(lit) as Part[]).reduce((sum, q) => (q === part ? sum : sum + lit[q]), 0)
    );
    return 1 - 0.6 * (1 - close) * others * (1 - lit[part]);
  };
  const cell = paint.cell ?? 1;
  const crowd = paint.crowd ?? 0;
  const shown = [
    cell * faded('dendrites'),
    cell * faded('axon'),
    cell * (paint.affAlpha ?? 1),
    ...OTHERS.map((_, k) => (k + 3 === RED_CELLS ? crowd * (paint.redCells ?? 1) : crowd)),
  ];
  glowSegs.length = 0;
  glowAxon.length = 0;
  for (let i = 1; i < wx.length; i++) {
    const axonal = n.type[i] === 2;
    const lim = axonal ? aLim : dLim;
    const p = n.parent[i];
    const d0 = n.dist[p];
    if (d0 >= lim || Math.hypot(n.x[i], n.y[i], n.z[i]) < inside) continue;
    const kept = paint.cut ? paint.cut(i) : 1;
    if (kept <= 0) continue;
    const d1 = n.dist[i];
    const k = Math.min(kept, d1 <= lim ? 1 : (lim - d0) / (d1 - d0));
    // from where it comes out of the soma: so, as the soma flattens into the dendrogram's root, the stems from it
    // grow in to its middle, rather than each appearing whole once it is clear
    const from = outOf([n.x[p], n.y[p], n.z[p]], [n.x[i], n.y[i], n.z[i]], inside);
    if (from >= k) continue;
    const x0 = sx[p] + (sx[i] - sx[p]) * from;
    const y0 = sy[p] + (sy[i] - sy[p]) * from;
    const x1 = sx[p] + (sx[i] - sx[p]) * k;
    const y1 = sy[p] + (sy[i] - sy[p]) * k;
    const width = Math.min(18, Math.max(axonal ? 0.55 : 0.7, diam[i] * x * s));
    if (off(x0, y0, x1, y1, width + 4)) continue;
    addTube(slabOf((sz[p] + sz[i]) / 2), axonal ? 1 : 0, x0, y0, x1, y1, width, lean);
    if (lit[axonal ? 'axon' : 'dendrites'] > 0.01)
      (axonal ? glowAxon : glowSegs).push(x0, y0, x1, y1);
  }

  // the other cells around it, on the second slide
  if (crowd > 0.01) {
    const { segs, segFamily, balls, ballFamily } = sc.crowd;
    for (let j = 0, k = 0; j < segs.length; j += 7, k++) {
      const a = turn(v, [segs[j] - c[0], segs[j + 1] - c[1], segs[j + 2] - c[2]]);
      const b = turn(v, [segs[j + 3] - c[0], segs[j + 4] - c[1], segs[j + 5] - c[2]]);
      const [x0, y0, x1, y1] = [ox + s * a[0], oy + s * a[1], ox + s * b[0], oy + s * b[1]];
      const width = Math.min(18, Math.max(0.6, segs[j + 6] * x * s));
      const slab = segFamily[k] === VESSEL ? BACK : slabOf((a[2] + b[2]) / 2);
      if (!off(x0, y0, x1, y1, width + 4)) addTube(slab, segFamily[k], x0, y0, x1, y1, width, lean);
    }
    for (let j = 0, k = 0; j < balls.length; j += 4, k++) {
      const q = turn(v, [balls[j] - c[0], balls[j + 1] - c[1], balls[j + 2] - c[2]]);
      const [bx, by] = [ox + s * q[0], oy + s * q[1]];
      if (outside(bx, by, 20)) continue;
      const slab = ballFamily[k] === RED_CELLS ? BACK : slabOf(q[2]);
      knobs[slab * FAMILIES + ballFamily[k]].push(bx, by, Math.max(1.5, balls[j + 3] * s * 1.1));
    }
  }

  // spines, once they are big enough to see
  const head = Math.max(0.5, 0.36 * x * s);
  if (sc.spines.length && 1.5 * x * s >= 0.9) {
    const sp9 = sc.spines;
    for (let j = 0; j < sp9.length; j += 9) {
      const i = sp9[j];
      if (n.dist[i] > dLim || (paint.cut && paint.cut(i) < 1)) continue;
      // drawn back into their branch as it goes into the dendrogram, which has none
      const keep = layout ? 1 - treeOf(flat, n.dist[i], n.dendritePath) : 1;
      if (keep < 0.05) continue;
      const t = turn(v, [sp9[j + 1] - c[0], sp9[j + 2] - c[1], sp9[j + 3] - c[2]]);
      const dir = turn(v, [sp9[j + 4], sp9[j + 5], sp9[j + 6]]);
      const base = sp9[j + 7] * x * s;
      const tip = base + sp9[j + 8] * x * s * keep;
      // carried along with the node it stands by
      const bx = ox + s * t[0] + mx[i];
      const by = oy + s * t[1] + my[i];
      if (outside(bx, by, 10)) continue;
      necks[slabOf(t[2])].push(
        bx + dir[0] * base,
        by + dir[1] * base,
        bx + dir[0] * tip,
        by + dir[1] * tip,
        head * keep
      );
    }
  }
  // swellings along the efferent axon: each as far along its segment as drawn — in the dendrogram too, where the
  // segment is laid out straight between where its ends have gone
  if (0.6 * x * s >= 0.55) {
    const bd = sc.beads;
    for (let j = 0; j < bd.length; j += 3) {
      const [i, f] = [bd[j], bd[j + 1]];
      const p = n.parent[i];
      if (n.dist[p] + f * (n.dist[i] - n.dist[p]) > aLim) continue;
      const bx = sx[p] + (sx[i] - sx[p]) * f;
      const by = sy[p] + (sy[i] - sy[p]) * f;
      if (outside(bx, by, 4)) continue;
      knobs[slabOf(sz[p] + (sz[i] - sz[p]) * f) * FAMILIES + 1].push(
        bx,
        by,
        Math.max(0.8, bd[j + 2] * x * s * 1.6)
      );
    }
  }
  // afferent axons, ending in boutons
  if (paint.aff) {
    const width = Math.max(0.9, 1.6 * x * s);
    sc.leads = sc.aff.map((a) => leadOf(sc, a, v, layout, flat));
    sc.aff.forEach((a, k) => {
      const f = paint.aff![k];
      if (f <= 0) return;
      const lead = sc.leads[k];
      const reach = f * a.d[a.d.length - 1];
      let prev = lead[0];
      let prevZ = turn(v, sub(a.pts[0], c))[2];
      for (let j = 1; j < lead.length && a.d[j - 1] < reach; j++) {
        let p = lead[j];
        const z = turn(v, sub(a.pts[j], c))[2];
        if (a.d[j] > reach) {
          const u = (reach - a.d[j - 1]) / (a.d[j] - a.d[j - 1]);
          p = { x: prev.x + (p.x - prev.x) * u, y: prev.y + (p.y - prev.y) * u };
        }
        if (!off(prev.x, prev.y, p.x, p.y, width + 4))
          addTube(slabOf((prevZ + z) / 2), 2, prev.x, prev.y, p.x, p.y, width, lean);
        prev = p;
        prevZ = z;
      }
      // and its bouton, where it meets the dendrite, big enough to see
      if (f >= 1)
        knobs[slabOf(prevZ) * FAMILIES + 2].push(prev.x, prev.y, Math.max(2.5, 2.6 * x * s));
    });
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // a picked-out part's halo, beneath it all: a wide soft stroke along every branch of it, held steady —
  // the sparkles on the dendrites and the spikes along the axon are what move
  for (const [segs, colour, strength] of [
    [glowSegs, look.cell, lit.dendrites],
    [glowAxon, look.eff, lit.axon],
  ] as const) {
    if (!segs.length || strength * cell < 0.01) continue;
    for (const [width, alpha] of [
      [14, 0.11 * strength * cell],
      [6.5, 0.2 * strength * cell],
    ]) {
      ctx.lineWidth = width;
      ctx.strokeStyle = rgba(colour, alpha);
      ctx.beginPath();
      for (let j = 0; j < segs.length; j += 4) {
        ctx.moveTo(segs[j], segs[j + 1]);
        ctx.lineTo(segs[j + 2], segs[j + 3]);
      }
      ctx.stroke();
    }
  }
  // in focus as deep as the view is wide — but, closer in than the tissue round the soma, never so shallow that
  // the soma's own slabs blur
  const focus = Math.max((Math.min(w, th) / 2 / s) * 0.8, 1.2 * thick * close);
  const soma = () =>
    drawSoma(
      ctx,
      sc,
      v,
      look,
      x,
      paint.somaAlpha * cell * faded('soma'),
      paint.somaGlow,
      lit.soma * beat * cell,
      flat
    );
  for (let slab = BACK; slab >= 0; slab--) {
    // the soma among its branches, at its own depth — or, in the dendrogram, over them all, as its root
    if (slab === SLABS / 2 - 1 && flat < 0.5) soma();
    // in focus at the soma, wherever the view is centred; the vessel at the back stays sharp, as it is not far
    // behind; and in the dendrogram, flat, nothing is out of focus
    const blur =
      slab === BACK
        ? 0
        : (1 - flat) * clamp01(Math.abs((slab - SLABS / 2 + 0.5) * thick) / focus - 0.35);
    const fog = (col: RGB) => mix(col, look.bg[0], 0.45 * blur);
    strokeSlab(
      ctx,
      slab,
      [fog(look.cell), fog(look.eff), fog(look.aff), ...OTHERS.map((o) => fog(o.colour))],
      1 - 0.45 * blur * (1 - close),
      1.3 * blur,
      !!look.white,
      shown,
      flat
    );
  }
  if (flat >= 0.5) soma();

  // over it all: star dust on the dendrites, where inputs land; and spikes running out along the axon
  const time = paint.time ?? 0;
  const white = !!look.white;
  const dust = lit.dendrites * cell;
  const nodes = sc.dendrites.nodes;
  if (dust > 0.01 && nodes.length) {
    for (
      let j = Math.max(0, Math.floor((time - DUST_LIFE) / DUST_EVERY));
      j <= time / DUST_EVERY;
      j++
    ) {
      const age = (time - j * DUST_EVERY) / DUST_LIFE;
      if (age < 0 || age > 1) continue;
      const rnd = mulberry32(j * 7919 + 13);
      const i = nodes[Math.floor(rnd() * nodes.length)];
      const q = n.parent[i];
      const f = rnd();
      const px = sx[q] + (sx[i] - sx[q]) * f;
      const py = sy[q] + (sy[i] - sy[q]) * f;
      if (outside(px, py, 10)) continue;
      // a twinkle that grows, turns a little and fades, and the branch under it lit for a moment
      const grow = Math.sin(Math.PI * age);
      glowAt(ctx, { x: px, y: py }, 5 + 9 * grow, look.cell, 0.45 * dust * grow, white);
      sparkle(
        ctx,
        px,
        py,
        (3.5 + 4 * rnd()) * grow,
        rnd() * Math.PI + age * 0.8,
        look.aff,
        dust * grow
      );
    }
  }
  const spikes = lit.axon * cell;
  if (spikes > 0.01) {
    const speed = spikeSpeed(s, w, th);
    for (let i = 1; i < wx.length; i++) {
      if (n.type[i] !== 2) continue;
      const q = n.parent[i];
      fronts(n.dist[q], n.dist[i], time, speed, (f) => {
        const px = sx[q] + (sx[i] - sx[q]) * f;
        const py = sy[q] + (sy[i] - sy[q]) * f;
        if (!outside(px, py, 10)) spike(ctx, px, py, sx[q], sy[q], look, spikes);
      });
    }
  }
}

/** Star dust on the dendrites: a new sparkle every this many ms, each lasting this long. */
const DUST_EVERY = 45;
const DUST_LIFE = 900;
/** Spikes leaving the soma along the axon: one every this many ms. */
const SPIKE_EVERY = 800;

/** How fast spikes run along the axon on screen, µm per ms: across about half the figure in a second. */
const spikeSpeed = (s: number, w: number, th: number) => (Math.min(w, th) / 2 / s) * 0.0011;

/**
 * Where the spikes that have left the soma since the stage began are, between
 * path distances `d0` and `d1` µm from it: `each` is handed how far between
 * them (0 to 1) each one is. Spikes run out along every branch at once.
 */
function fronts(d0: number, d1: number, time: number, speed: number, each: (f: number) => void) {
  if (d1 <= d0) return;
  const newest = Math.floor((time - d0 / speed) / SPIKE_EVERY);
  const oldest = Math.max(0, Math.ceil((time - d1 / speed) / SPIKE_EVERY));
  for (let k = oldest; k <= newest; k++) {
    const f = ((time - k * SPIKE_EVERY) * speed - d0) / (d1 - d0);
    if (f >= 0 && f <= 1) each(f);
  }
}

/**
 * A spike on the axon at (x, y), come from (bx, by): a glow, a short tail
 * behind it, and a bead at its heart — darker than the axon it runs along, and
 * lit, so it stands out from it.
 */
function spike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bx: number,
  by: number,
  look: Look,
  alpha: number
) {
  const core = look.white ? mix(look.eff, [90, 20, 0], 0.45) : mix(look.eff, WHITE, 0.6);
  glowAt(ctx, { x, y }, 11, look.eff, alpha, !!look.white);
  const back = Math.hypot(bx - x, by - y);
  if (back > 0.5) {
    const k = Math.min(1, 14 / back);
    ctx.lineCap = 'round';
    for (const [width, strength] of [
      [4, 0.25],
      [1.8, 0.7],
    ]) {
      ctx.strokeStyle = rgba(core, strength * alpha);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (bx - x) * k, y + (by - y) * k);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(x, y, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = rgba(core, alpha);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 0.9, y - 0.9, 1, 0, Math.PI * 2);
  ctx.fillStyle = rgba(WHITE, 0.85 * alpha);
  ctx.fill();
}

/** A sparkle: a four-pointed star with a smaller one turned across it. */
function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  colour: RGB,
  alpha: number
) {
  if (alpha < 0.01 || r < 0.4) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = rgba(colour, Math.min(1, alpha));
  for (const [turn, size] of [
    [angle, r],
    [angle + Math.PI / 4, r * 0.5],
  ]) {
    ctx.rotate(turn);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.fill();
    ctx.rotate(-turn);
  }
  ctx.restore();
}

/* words */

/** Italic words with a dark halo, so they read over anything. */
function tag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colour: RGB,
  halo: RGB | null,
  alpha: number,
  size = 12,
  align: CanvasTextAlign = 'left'
) {
  if (alpha < 0.01) return;
  ctx.font = `italic ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = rgba(halo, 0.75 * alpha);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = rgba(colour, alpha);
  ctx.fillText(text, x, y);
}

/**
 * A name for what is at `p`, set off from it away from the figure's middle
 * (above and to the right, for something at the middle), with an arrow to it.
 */
function callout(
  ctx: CanvasRenderingContext2D,
  text: string,
  p: Pt,
  middle: Pt,
  look: Look,
  alpha: number,
  w: number,
  th: number
) {
  if (alpha < 0.01) return;
  let dx = p.x - middle.x;
  let dy = p.y - middle.y;
  const far = Math.hypot(dx, dy);
  [dx, dy] = far < 30 ? [0.6, -0.8] : [dx / far, dy / far];
  ctx.font = `italic 13px ${SERIF}`;
  const tw = ctx.measureText(text).width;
  const leftward = dx < 0;
  let lx = p.x + dx * 64;
  lx = leftward ? Math.max(lx, 12 + tw) : Math.min(lx, w - 12 - tw);
  const ly = clamp(p.y + dy * 52, 52, th - 14);
  // from beside the words to just short of the cell
  const sx = lx + (leftward ? 5 : -5);
  const len = Math.hypot(p.x - sx, p.y - ly);
  if (len > 14) {
    const ux = (p.x - sx) / len;
    const uy = (p.y - ly) / len;
    const tx = p.x - ux * 8;
    const ty = p.y - uy * 8;
    ctx.strokeStyle = rgba(look.text, 0.7 * alpha);
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, ly);
    ctx.lineTo(tx, ty);
    const a = Math.atan2(uy, ux);
    ctx.moveTo(tx - Math.cos(a - 0.45) * 7, ty - Math.sin(a - 0.45) * 7);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx - Math.cos(a + 0.45) * 7, ty - Math.sin(a + 0.45) * 7);
    ctx.stroke();
  }
  tag(ctx, text, lx, ly, look.text, look.bg[1], alpha, 13, leftward ? 'right' : 'left');
}

const NICE = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

/** A scale bar: the longest round length under 96 px. */
function scaleBar(ctx: CanvasRenderingContext2D, s: number, right: number, y: number, look: Look) {
  let len = NICE[0];
  for (const l of NICE) if (l * s <= 96) len = l;
  const px = len * s;
  ctx.fillStyle = rgba(look.bg[1], 0.6);
  ctx.beginPath();
  ctx.roundRect(right - px - 6, y - 21, px + 12, 27, 4);
  ctx.fill();
  ctx.fillStyle = rgba(look.text, 0.85);
  ctx.fillRect(right - px, y - 1.5, px, 3);
  ctx.font = `italic 11px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    len >= 10000 ? `${len / 10000} cm` : len >= 1000 ? `${len / 1000} mm` : `${len} µm`,
    right - px / 2,
    y - 6
  );
}

/**
 * What the plate itself says: whose data it shows, at its bottom left — each
 * line only while what it credits shows, those above sliding down as one goes
 * — and a scale bar. The neuron's name, and its own credit once it is named,
 * are the figure's, above its top left.
 */
function plate(
  ctx: CanvasRenderingContext2D,
  look: Look,
  w: number,
  th: number,
  s: number,
  credits: Credit[],
  bar = 1
) {
  let y = th - 12;
  for (const { text, alpha } of credits) {
    if (alpha < 0.01) continue;
    tag(ctx, text, 14, y, look.text, null, 0.6 * alpha, w < 560 ? 9 : 10.5);
    y -= 14 * alpha;
  }
  // no bar where each neuron is drawn to a scale of its own
  if (bar > 0.5) scaleBar(ctx, s, w - 16, th - 8, look);
}

interface Credit {
  text: string;
  alpha: number;
}

/** Whose reconstruction a neuron is. */
const labOf = (n: Neuron) =>
  n.source.replace(', NeuroMorpho.Org', '').replace('MouseLight, Janelia', 'Janelia MouseLight');

/**
 * Whose data is showing, and how much of it: the atlas, while the brain is in
 * view; the neuron, until it is named — its credit then goes with its name —
 * or all ten, while the others show; and the glia, while they show.
 */
function creditsOf(sc: Scene, pose: Pose, crew: (Scene | null)[] = [], sel = -1): Credit[] {
  // the others only count where they are drawn: on the slides that show all ten
  const others = crew.length
    ? pose.crew.reduce((most, p, i) => (i === sel ? most : Math.max(most, p.alpha)), 0)
    : 0;
  const labs = [...new Set(crew.flatMap((k) => (k ? [labOf(k.n)] : [])))];
  return [
    {
      text: 'Allen Mouse Brain Common Coordinate Framework (CCFv3)',
      alpha: Math.max(pose.brain, pose.regions) * (1 - pose.trio),
    },
    { text: `Neuron: ${labOf(sc.n)}`, alpha: pose.cell * (1 - pose.title) * (1 - others) },
    { text: `Neurons: ${labs.join(', ')}`, alpha: others },
    { text: `Glia: ${sc.crowd.sources.join(', ')}`, alpha: pose.crowd },
  ];
}

/** Which colour is which: in, and out. */
function legend(ctx: CanvasRenderingContext2D, look: Look, w: number, alpha: number) {
  if (alpha < 0.01) return;
  ctx.font = `italic 11px ${SERIF}`;
  const rows: [RGB, string][] = [
    [look.aff, 'afferent axons — in'],
    [look.eff, 'efferent axon — out'],
  ];
  rows.forEach(([colour, text], k) => {
    const y = 38 + k * 16;
    const tw = ctx.measureText(text).width;
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w - 14 - tw - 26, y);
    ctx.lineTo(w - 14 - tw - 8, y);
    ctx.stroke();
    tag(ctx, text, w - 14, y, look.text, null, 0.85 * alpha, 11, 'right');
  });
}

/** An arrowhead at `p`, heading `angle`, with a dark edge so it reads over the branches. */
function arrowhead(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  angle: number,
  colour: RGB,
  edge: RGB,
  alpha: number
) {
  if (alpha < 0.01) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, c] of [
    [3.6, edge],
    [1.7, colour],
  ] as [number, RGB][]) {
    ctx.strokeStyle = rgba(c, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(angle - 0.55) * 7, p.y - Math.sin(angle - 0.55) * 7);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(angle + 0.55) * 7, p.y - Math.sin(angle + 0.55) * 7);
    ctx.stroke();
  }
}

/** The arrowhead `f` of the way along a route on screen, pointing the way it runs. */
function arrowAlong(
  ctx: CanvasRenderingContext2D,
  route: Pt[],
  f: number,
  colour: RGB,
  edge: RGB,
  alpha: number
) {
  if (route.length < 2) return;
  const cum = lengths(route);
  const d = f * cum[cum.length - 1];
  const p = pointAt(route, cum, d);
  const q = pointAt(route, cum, d + 5);
  arrowhead(ctx, q, Math.atan2(q.y - p.y, q.x - p.x), colour, edge, alpha);
}

/** A pulse of light `reach` µm along a route, with a short tail behind it. */
function pulse(
  ctx: CanvasRenderingContext2D,
  route: Pt[],
  d: number[],
  reach: number,
  colour: RGB,
  r: number,
  alpha: number,
  white = false
) {
  const ahead = upTo(route, d, reach);
  const head = ahead[ahead.length - 1];
  const tail = ahead.slice(Math.max(0, ahead.length - 6));
  if (tail.length > 1) {
    ctx.save();
    if (!white) ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(colour, (white ? 0.5 : 0.45) * alpha);
    ctx.lineWidth = r * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tail[0].x, tail[0].y);
    for (const p of tail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }
  glowAt(ctx, head, r, colour, alpha, white);
  if (white && alpha > 0.05) {
    // and a bright bead at its heart, which on white the glow alone cannot give
    ctx.beginPath();
    ctx.arc(head.x, head.y, Math.max(1.5, r * 0.26), 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(colour, [0, 0, 0], 0.12), Math.min(1, alpha));
    ctx.fill();
  }
}

/** The nodes a spike runs out to from the soma: the axon's, all of them, and those on the way out to it. */
const outwards = new WeakMap<Scene, Int32Array>();
function outwardOf(sc: Scene) {
  let known = outwards.get(sc);
  if (!known) {
    const onWay = new Set(sc.n.output);
    const out: number[] = [];
    for (let i = 1; i < sc.n.x.length; i++) if (sc.n.type[i] === 2 || onWay.has(i)) out.push(i);
    known = Int32Array.from(out);
    outwards.set(sc, known);
  }
  return known;
}

/**
 * A spike `reach` µm out from the soma along every branch of the axon at once,
 * splitting at each fork: a head on each branch it has come to, and a tail
 * `tail` µm long behind it — the tails one stroke, so that they do not double
 * up where branches meet.
 */
function spread(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  reach: number,
  tail: number,
  look: Look,
  white: boolean,
  edge = Infinity
) {
  const { n, sx, sy } = sc;
  const heads: Pt[] = [];
  ctx.save();
  if (!white) ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(look.eff, white ? 0.5 : 0.45);
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const i of outwardOf(sc)) {
    const p = n.parent[i];
    const [d0, d1] = [n.dist[p], n.dist[i]];
    if (d1 <= d0 || d0 > reach || d1 < reach - tail) continue;
    const [a, b] = [
      (Math.max(d0, reach - tail) - d0) / (d1 - d0),
      (Math.min(d1, reach) - d0) / (d1 - d0),
    ];
    const head = { x: sx[p] + (sx[i] - sx[p]) * b, y: sy[p] + (sy[i] - sy[p]) * b };
    const back = { x: sx[p] + (sx[i] - sx[p]) * a, y: sy[p] + (sy[i] - sy[p]) * a };
    if (back.x >= edge - 1 && head.x >= edge - 1) continue;
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(head.x, head.y);
    // none where the dendrogram's axon stops at the edge of the figure, with what is past it gathered there
    if (reach <= d1 && head.x < edge - 1 && !outside(head.x, head.y, 12)) heads.push(head);
  }
  ctx.stroke();
  ctx.restore();
  for (const head of heads) glowAt(ctx, head, 11, look.eff, 1, white);
  if (white && heads.length) {
    // and a bright bead at the heart of each, which on white the glow alone cannot give
    ctx.beginPath();
    for (const head of heads) {
      ctx.moveTo(head.x + 2.9, head.y);
      ctx.arc(head.x, head.y, 2.9, 0, Math.PI * 2);
    }
    ctx.fillStyle = rgba(mix(look.eff, [0, 0, 0], 0.12), 1);
    ctx.fill();
  }
}

/* ----------------------------------------------------------------- slides */

/** The angle each neuron was last shown at, so the next slide's figure carries on from there. */
const handoff = new Map<string, number>();

/** The view that shows the neuron best — or its mirror, whichever is nearer `from`. */
const facingFrom = (sc: Scene, from: number) =>
  sc.yawPresent + Math.PI * Math.round((from - sc.yawPresent) / Math.PI);

/**
 * The angle a stage is seen at, `elapsed` ms after it started at `from`. The
 * second slide turns to face the cells laid out around the neuron — that view,
 * or its mirror, whichever is nearer — and holds there, swaying a little; so,
 * without the sway, does the slide that turns it into a dendrogram, laid out as
 * that view sees it, and the dendrogram's signals stay there. The rest turn
 * steadily on.
 */
function yawOf(sc: Scene, stage: Stage, from: number, elapsed: number, t: number) {
  const turning = from + (sc.spin * elapsed) / 1000;
  if (stage === 'mouse') {
    // drawing back from the brain, turning on as it did while the signals passed, round to a little in front of
    // either side, whichever is nearer, and swaying about it
    const e = phase(t, 0, DRAW_BACK);
    return turnTo(turning, mouseFacing(from), e) + MOUSE_SWAY * Math.sin(elapsed / 2600) * e;
  }
  // learning: held as the last slide left it — then, diving in, turned to face the two neurons' plane (see crewPose);
  // and, the diseases named, held as the mouse fades
  if (stage === 'learn' || stage === 'disease') return from;
  // to the cheese: round to a little in front of the mouse's side again, swaying
  if (stage === 'seek') {
    const e = phase(t, 0, 1500);
    return turnTo(from, mouseFacing(from), e) + MOUSE_SWAY * Math.sin(elapsed / 2600) * e;
  }
  const facing = facingFrom(sc, from);
  if (stage === 'signals' || isClose(stage)) return facing;
  if (stage === 'dendrogram') return lerp(turning, facing, phase(t, 0, MORPH_FOR * 0.6));
  if (stage !== 'cells') return turning;
  const e = phase(t, ZOOM_AT, ZOOM_FOR);
  return lerp(turning, facing, e) + 0.06 * Math.sin(elapsed / 1900) * e;
}

/** The angle a stage starts at when nothing came before it to carry on from. */
function startingYaw(sc: Scene, stage: Stage) {
  if (stage === 'brain') return sc.yaw0;
  if (stage === 'cells') return sc.yaw0 + (sc.spin * BRAIN_IN) / 1000;
  return sc.yawPresent + (sc.spin * LATER[stage]) / 1000;
}

/**
 * Where a stage's camera is — its angle, its scale, and a point in the brain
 * with where that point is on screen — and how much of each thing it shows. A
 * change of slide eases from the pose last drawn to the new stage's own, so
 * the figure moves on smoothly whichever way the slides go, however fast.
 */
interface Pose {
  yaw: number;
  s: number;
  c: V3;
  ox: number;
  oy: number;
  /** How much further down than PITCH the view looks — tilted by hand, or to look square on to something. */
  tilt: number;
  /** How far the picture is spun about the line of sight, clockwise: turning what is seen square on, as it is. */
  roll: number;
  /** How far the neuron has turned into a dendrogram, and the angle that was laid out as seen from. */
  tree: number;
  treeYaw: number;
  /** The glass brain, the ten's regions in it, the neuron itself, the other cells, and each of their names. */
  brain: number;
  regions: number;
  cell: number;
  crowd: number;
  redCells: number;
  names: number[];
  /** How strongly each part of the neuron is picked out; and the plate's title. */
  lit: Record<Part, number>;
  title: number;
  /** All ten neurons, this one among them, in the family's order: each where it is, and how much of it shows. */
  crew: Place[];
  /** The mouse round the brain; the ten's names, side by side, and their legend in the brain. */
  mouse: number;
  /** Signals passing among the ten, and the ways they take drawn; and how far the mouse is into its walk. */
  talk: number;
  arcs: number;
  walk: number;
  /** The cheese in front of it; the two neurons it learns with, their axons drawn whole; and their changing. */
  cheese: number;
  pair: number;
  plastic: number;
  /** How far the mouse has walked on, µm along AP. */
  go: number;
  labels: number;
  legend: number;
  /** How much of this neuron's axon shows — all of it, or the start of it, as the others' do; and its afferents. */
  axonAll: number;
  aff: number;
  /** How much each of the diseases named over the page shows, in ILLS' order. */
  ills: number[];
  /**
   * How far the dendrogram is drawn in on its piece of dendrite (1 not at all),
   * and how far that piece has come to the figure's middle; and how much of the
   * membrane there, its ions and its channels, shows.
   */
  zoom: number;
  pan: number;
  ions: number;
  /** How much the first slide's row of three brains shows: a fly's and a human's beside the mouse's, each named. */
  trio: number;
  /** On a slide of this neuron's own, how much the rest of the ten show, each in its place in the brain. */
  others: number;
  /**
   * One region's own kinds of neuron: how much they show within it, in the
   * brain, as the view closes in on it; and how far they have come out of it to
   * their places side by side, the page over the brain behind them.
   */
  kindsIn: number;
  kinds: number;
  /**
   * Close in on the piece of dendrite, a slide at a time: how much its membrane
   * shows, drawn on the band the branch has become; how far the view has
   * closed in on its top wall; how many ions of both kinds wander either side of
   * it; how much of the charge lining it either side at
   * rest, and of the voltage that charge makes, under the
   * dendrite, at each place along it; how much of a synapse onto it, now and
   * then letting charge in; and whether that charge, and the voltage with it,
   * spreads along the dendrite.
   */
  skin: number;
  near: number;
  free: number;
  lined: number;
  volt: number;
  syn: number;
  spread: number;
  /** And how much each of those slides' own names show, each on its own, in CLOSE's order. */
  tags: number[];
}

/**
 * Where one of the ten is, in a pose: seen on its own — turned `yaw`, `s` px
 * to the µm, its dendrites' middle at (ox, oy) — or, `stick` of the way, held
 * in place in the brain as the pose's own camera sees it; and how much of it
 * shows.
 */
interface Place {
  yaw: number;
  s: number;
  ox: number;
  oy: number;
  stick: number;
  alpha: number;
}

/** The angle from `a` to `b` the short way round, `k` of the way. */
const turnTo = (a: number, b: number, k: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** How long a change of slide takes to ease the figure from one pose to the next, ms. */
const BLEND = 700;

/** `k` of the way from pose `a` to pose `b` — and the diseases' names `quick` of the way, on a clock of their own. */
function mixPose(a: Pose, b: Pose, k: number, quick = k): Pose {
  const mixed = (x: number, y: number) => x + (y - x) * k;
  // coming, at the pace of the rest; going, quickly
  const toward = (x: number, y: number) => x + (y - x) * (y > x ? k : quick);
  // the camera, as if nothing had been carried along by the mouse walking — so that what it carried moves with
  // the view, rather than drifting across it as the walk is undone
  const go = mixed(a.go, b.go);
  const [ca, cb] = [sub(a.c, [a.go, 0, 0]), sub(b.c, [b.go, 0, 0])];
  // b's point, from where a's view has it to where b's does, the scale eased between: zooming about the one place
  // on screen that stays put, so that everything moves along a straight line — or, the scale the same, sliding
  const p = at(view(a.yaw, a.s, ca, a.ox, a.oy, PITCH + a.tilt, a.roll), cb);
  const r = b.s / a.s;
  const grow = r ** k;
  const still: Pt =
    Math.abs(1 - r) < 0.02 ? p : { x: (b.ox - r * p.x) / (1 - r), y: (b.oy - r * p.y) / (1 - r) };
  const [ox, oy] =
    still === p
      ? [mixed(p.x, b.ox), mixed(p.y, b.oy)]
      : [still.x + grow * (p.x - still.x), still.y + grow * (p.y - still.y)];
  return {
    yaw: turnTo(a.yaw, b.yaw, k),
    tilt: mixed(a.tilt, b.tilt),
    roll: turnTo(a.roll, b.roll, k),
    s: a.s * grow,
    c: add(cb, [go, 0, 0]),
    ox,
    oy,
    // into b's dendrogram; or back out of a's
    tree: mixed(a.tree, b.tree),
    treeYaw: b.tree > 0.001 ? b.treeYaw : a.treeYaw,
    brain: mixed(a.brain, b.brain),
    regions: mixed(a.regions, b.regions),
    cell: mixed(a.cell, b.cell),
    crowd: mixed(a.crowd, b.crowd),
    redCells: mixed(a.redCells, b.redCells),
    names: b.names.map((n, i) => mixed(a.names[i] ?? 0, n)),
    lit: {
      dendrites: mixed(a.lit.dendrites, b.lit.dendrites),
      axon: mixed(a.lit.axon, b.lit.axon),
      soma: mixed(a.lit.soma, b.lit.soma),
    },
    title: mixed(a.title, b.title),
    // each of the ten from where a has it to where b does: one coming in comes in where b has it, one going goes where a had it
    crew: b.crew.map((q, i) => {
      const p = a.crew[i];
      if (!p || p.alpha < 0.01) return { ...q, alpha: mixed(0, q.alpha) };
      if (q.alpha < 0.01) return { ...p, alpha: mixed(p.alpha, 0) };
      return {
        yaw: turnTo(p.yaw, q.yaw, k),
        s: p.s * (q.s / p.s) ** k,
        ox: mixed(p.ox, q.ox),
        oy: mixed(p.oy, q.oy),
        stick: mixed(p.stick, q.stick),
        alpha: mixed(p.alpha, q.alpha),
      };
    }),
    mouse: mixed(a.mouse, b.mouse),
    ills: ILLS.map((_, i) => (a.ills[i] ?? 0) + ((b.ills[i] ?? 0) - (a.ills[i] ?? 0)) * quick),
    zoom: a.zoom * (b.zoom / a.zoom) ** k,
    pan: mixed(a.pan, b.pan),
    // and the membrane, as quickly out of the way — or, coming back to it, only once the view is close enough
    ions: a.ions + (b.ions - a.ions) * (b.ions > a.ions ? smooth(clamp01((k - 0.7) / 0.3)) : quick),
    // and the other brains, as quickly out of the way of the view closing in on the mouse's
    trio: a.trio + (b.trio - a.trio) * quick,
    others: mixed(a.others, b.others),
    // and the region's kinds of neuron, as quickly out of the way of the view drawing back from them
    kindsIn: a.kindsIn + (b.kindsIn - a.kindsIn) * (b.kindsIn > a.kindsIn ? k : quick),
    kinds: a.kinds + (b.kinds - a.kinds) * (b.kinds > a.kinds ? k : quick),
    // and the membrane, the charge either side of it and the rest of it built up a slide at a time: as quickly out
    // of the way, going
    skin: toward(a.skin, b.skin),
    near: mixed(a.near, b.near),
    free: toward(a.free, b.free),
    lined: toward(a.lined, b.lined),
    volt: toward(a.volt, b.volt),
    syn: toward(a.syn, b.syn),
    spread: b.spread,
    tags: b.tags.map((v, i) => toward(a.tags[i] ?? 0, v)),
    talk: mixed(a.talk, b.talk),
    arcs: mixed(a.arcs, b.arcs),
    walk: mixed(a.walk, b.walk),
    cheese: mixed(a.cheese, b.cheese),
    pair: mixed(a.pair, b.pair),
    plastic: mixed(a.plastic, b.plastic),
    go,
    labels: mixed(a.labels, b.labels),
    legend: mixed(a.legend, b.legend),
    axonAll: mixed(a.axonAll, b.axonAll),
    aff: mixed(a.aff, b.aff),
  };
}

/** The view a pose sees from. */
const viewOf = (p: Pose) => view(p.yaw, p.s, p.c, p.ox, p.oy, PITCH + p.tilt, p.roll);

/** A pose as turned and tilted by hand: the camera and each of the ten turned alike, and the view tilted. */
function byHand(pose: Pose, hand: { yaw: number; tilt: number }): Pose {
  if (!hand.yaw && !hand.tilt) return pose;
  return {
    ...pose,
    yaw: pose.yaw + hand.yaw,
    tilt: pose.tilt + hand.tilt,
    crew: pose.crew.map((p) => ({ ...p, yaw: p.yaw + hand.yaw })),
  };
}

/** How far a drag across the figure turns it, and tilts it, radians per px; and how far it may tilt either way. */
const TURN_PER_PX = 0.008;
const TILT_PER_PX = 0.006;
const TILT_RANGE: [number, number] = [-0.6, 1.1];

/** The slides that show all ten together. */
const CREW = ['gallery', 'atlas', 'area', 'talk', 'mouse', 'learn', 'seek', 'disease'] as const;
type CrewStage = (typeof CREW)[number];
const isCrew = (stage: Stage): stage is CrewStage => (CREW as readonly Stage[]).includes(stage);

/** How far along from `a` to `b` a line leaves a ball of radius `r` about the origin: 0 if `a` is outside it already. */
function outOf(a: V3, b: V3, r: number) {
  const aa = dot(a, a);
  if (aa >= r * r) return 0;
  const d = sub(b, a);
  const dd = dot(d, d) || 1;
  const ad = dot(a, d);
  return clamp01((-ad + Math.sqrt(Math.max(0, ad * ad - dd * (aa - r * r)))) / dd);
}

/** A one-neuron pose, with the ten's places filled in — the rest of them `pose.others` there: this one held in the camera's view, the rest not shown. */
function withCrew(pose: Pose, sc: Scene, sel: number, count: number): Pose {
  const p = at(viewOf(pose), sc.core);
  pose.crew = Array.from({ length: count }, (_, i) => ({
    yaw: pose.yaw,
    s: pose.s,
    ox: p.x,
    oy: p.y,
    stick: 1,
    alpha: i === sel ? pose.cell : pose.others,
  }));
  return pose;
}

/** Room under each of the ten, side by side, for its name and where it is from, px. */
const LABEL_ROOM = 30;

/** Where the ten go side by side: two rows of five, each with its name under it — and room under them for the credit. */
function slotOf(i: number, w: number, h: number) {
  const [top, foot] = [4, 20];
  const rowH = (h - top - foot) / 2;
  const [col, row] = [i % 5, Math.floor(i / 5)];
  return {
    x: ((col + 0.5) * w) / 5,
    y: top + row * rowH + (rowH - LABEL_ROOM) / 2,
    w: w / 5,
    h: rowH - LABEL_ROOM,
    label: top + (row + 1) * rowH - LABEL_ROOM + 9,
  };
}

/** The mouse's views: a little in front of either side; how far the view sways about it, radians. */
const MOUSE_YAW = 0.42;
const MOUSE_SWAY = 0.2;
const MOUSE_YAWS = [MOUSE_YAW, -MOUSE_YAW, Math.PI + MOUSE_YAW, Math.PI - MOUSE_YAW];
const mouseFacing = (from: number) =>
  MOUSE_YAWS.reduce((best, y) =>
    Math.abs(Math.atan2(Math.sin(y - from), Math.cos(y - from))) <
    Math.abs(Math.atan2(Math.sin(best - from), Math.cos(best - from)))
      ? y
      : best
  );
/** What a view of the mouse takes in: the mouse; it and the cheese ahead of it; or it, arrived at the cheese, and the cheese. */
type MouseShot = 'mouse' | 'cheese' | 'arrived';
const mouseFits = new Map<MouseShot, { centre: V3; lo: [number, number]; hi: [number, number] }>();
/**
 * The middle of what a view of the mouse takes in, and how far that reaches
 * across and up and down the screen, µm, in any of those views swayed either way.
 */
function mouseFrame(shot: MouseShot = 'mouse') {
  let mouseFit = mouseFits.get(shot);
  if (!mouseFit) {
    const body = mouseMesh().v;
    const cheese = shot === 'mouse' ? [] : cheeseCorners().flat();
    const moved =
      shot === 'arrived' ? Float32Array.from(body, (x, i) => (i % 3 ? x : x + TO_CHEESE)) : body;
    const v = Float32Array.from([...moved, ...cheese]);
    const centre = centreOf(v);
    const [cp, sp] = [Math.cos(PITCH), Math.sin(PITCH)];
    const lo: [number, number] = [Infinity, Infinity];
    const hi: [number, number] = [-Infinity, -Infinity];
    for (const yaw of MOUSE_YAWS.flatMap((y) => [y - MOUSE_SWAY, y, y + MOUSE_SWAY])) {
      const [ct, st] = [Math.cos(yaw), Math.sin(yaw)];
      for (let i = 0; i < v.length; i += 3) {
        const [qa, qd, qm] = [v[i] - centre[0], v[i + 1] - centre[1], v[i + 2] - centre[2]];
        const x = qa * ct - qm * st;
        const y = qd * cp - (qa * st + qm * ct) * sp;
        lo[0] = Math.min(lo[0], x);
        lo[1] = Math.min(lo[1], y);
        hi[0] = Math.max(hi[0], x);
        hi[1] = Math.max(hi[1], y);
      }
    }
    mouseFit = { centre, lo, hi };
    mouseFits.set(shot, mouseFit);
  }
  return mouseFit;
}

/** While the diseases are named: the brain where the mouse left it, by the cheese — in the middle, ILL_ZOOM times as big. */
function illCamera(main: Scene, w: number, h: number) {
  const m = mouseCamera(w, h, 'arrived');
  return { s: m.s * ILL_ZOOM, c: add(main.brainCentre, [TO_CHEESE, 0, 0]), ox: w / 2, oy: h / 2 };
}

/** The camera on the mouse — and, maybe, the cheese: as big as all that fits, centred in the figure. */
function mouseCamera(w: number, h: number, shot: MouseShot = 'mouse') {
  const { centre, lo, hi } = mouseFrame(shot);
  const s = Math.min((w - 48) / (hi[0] - lo[0]), (h - 40) / (hi[1] - lo[1]));
  return {
    s,
    c: centre,
    ox: w / 2 - (s * (lo[0] + hi[0])) / 2,
    oy: h / 2 - (s * (lo[1] + hi[1])) / 2,
  };
}

/**
 * The ten together, posed: side by side, each turning on its own, the others
 * coming in beside this one; then each in its place in the brain, the brain
 * and their regions coming in — to one side, with room for a legend; then the
 * view drawn back to the mouse the brain is in.
 */
function crewPose(
  main: Scene,
  crew: (Scene | null)[],
  family: Spec[],
  sel: number,
  stage: CrewStage,
  t: number,
  elapsed: number,
  from: number,
  yaw: number,
  treeYaw: number,
  w: number,
  h: number
): Pose {
  const f = frameOf(w, h);
  const room = w >= 640;
  // the brain, as the atlas has it — to one side, with room for its legend
  let camera = {
    s: f.fit(main.brainExt, 26, 22),
    c: main.brainCentre,
    ox: room ? w * 0.4 : f.cx,
    oy: f.cy,
  };
  // the signals passing in the brain, as the atlas has it: held there on their own slide; drawn back from at once
  // on the next, to the mouse round it
  const said = stage === 'talk' || stage === 'mouse';
  const hold = stage === 'talk' ? Infinity : 0;
  const back = said ? phase(t, hold, DRAW_BACK) : 0;
  if (back > 0) {
    // drawing back from it to the mouse round it, the brain held in view all the way
    const m = mouseCamera(w, h);
    const end = at(view(yaw, m.s, m.c, m.ox, m.oy), main.brainCentre);
    camera = {
      s: camera.s * (m.s / camera.s) ** back,
      c: main.brainCentre,
      ox: lerp(camera.ox, end.x, back),
      oy: lerp(camera.oy, end.y, back),
    };
  }
  // one region's own: closing in on the somatosensory cortex, where AREA_ID lives — its place on screen carried to
  // the middle as the view grows, as diving in to the two that learn does
  const area = stage === 'area';
  const there = area ? (crew[family.findIndex((k) => k.id === AREA_ID)] ?? main) : null;
  // and, once its kinds of neuron are in, all of it gone under them
  const gone = area ? 1 - phase(t, AREA_AT, AREA_IN) : 1;
  if (there) {
    const into = phase(t, 0, AREA_ZOOM_FOR);
    const start = at(view(yaw, camera.s, camera.c, camera.ox, camera.oy), there.soma);
    camera = {
      s: camera.s * AREA_ZOOM ** into,
      c: there.soma,
      ox: lerp(start.x, f.cx, into),
      oy: lerp(start.y, f.cy, into),
    };
  }
  // learning: the mouse, the cheese in front of it — then diving into its brain, to the two that change
  const learning = stage === 'learn';
  const [pre, post] = [PRE, POST].map((id) => crew[family.findIndex((k) => k.id === id)] ?? null);
  const pl = learning && pre && post ? plasticOf(pre, post) : null;
  const dive = pl ? phase(t, CHEESE_FOR, DIVE_FOR) : 0;
  // diving in, turning to look down square on to the plane they meet in — and, there, turning on as the neurons
  // do elsewhere, but about the line of sight, so that plane stays square on
  let [look, tilt, roll] = [yaw, 0, 0];
  if (learning) {
    const m = mouseCamera(w, h, 'cheese');
    camera = m;
    if (pl && dive > 0) {
      // close enough to see them by, with room for them however far round they have turned
      const close = Math.min(f.fit(pl.ext, 70, 46), Math.min(w / 2 - 70, h / 2 - 12) / pl.ext.hr);
      const start = at(view(yaw, m.s, m.c, m.ox, m.oy), pl.centre);
      camera = {
        s: m.s * (close / m.s) ** dive,
        c: pl.centre,
        ox: lerp(start.x, f.cx, dive),
        oy: lerp(start.y, f.cy, dive),
      };
      look = turnTo(yaw, pl.yaw, dive);
      tilt = (pl.pitch - PITCH) * dive;
      // easing into the turn as the dive ends
      const into = Number.isFinite(t) ? Math.max(0, t - (CHEESE_FOR + 0.6 * DIVE_FOR)) : 0;
      roll = (SPIN * (into < ROLL_IN ? (into * into) / (2 * ROLL_IN) : into - ROLL_IN / 2)) / 1000;
    }
  }
  // to the cheese: walking on along the way to it, the view closing in on it as the mouse comes
  const seeking = stage === 'seek';
  const going = seeking ? phase(t, SEEK_AT, SEEK_FOR) : 0;
  // the diseases named: the mouse fading from round its brain, where it came to by the cheese, and the brain drawn
  // into the middle, the ten still talking in it
  const ill = stage === 'disease';
  if (ill) camera = illCamera(main, w, h);
  const go = seeking ? TO_CHEESE * going : ill ? TO_CHEESE : 0;
  if (seeking) {
    const [a, b] = [mouseCamera(w, h, 'cheese'), mouseCamera(w, h, 'arrived')];
    const start = at(view(yaw, a.s, a.c, a.ox, a.oy), b.c);
    camera = {
      s: a.s * (b.s / a.s) ** going,
      c: b.c,
      ox: lerp(start.x, b.ox, going),
      oy: lerp(start.y, b.oy, going),
    };
  }
  const at2 = (k: number) => (learning ? phase(t, CHEESE_FOR + k * DIVE_FOR, 0.4 * DIVE_FOR) : 0);
  const cam = view(look, camera.s, camera.c, camera.ox, camera.oy, PITCH + tilt, roll);
  const spun = (elapsed * GALLERY_SPIN) / 1000;
  return {
    yaw: look,
    tilt,
    roll,
    ...camera,
    tree: 0,
    treeYaw,
    brain: stage === 'gallery' ? 0 : stage === 'atlas' ? phase(t, 0, 800) : (1 - at2(0.5)) * gone,
    regions: area
      ? gone
      : stage === 'atlas'
        ? phase(t, 300, 900)
        : said
          ? 0.55 * (1 - phase(t, hold, 1400))
          : 0,
    cell: 1,
    crowd: 0,
    redCells: 0,
    names: main.crowd.names.map(() => 0),
    lit: UNLIT,
    title: 0,
    crew: crew.map((sc, i): Place => {
      if (!sc) return { yaw, s: camera.s, ox: 0, oy: 0, stick: 1, alpha: 0 };
      if (stage === 'gallery') {
        const slot = slotOf(i, w, h);
        return {
          yaw: (i === sel ? from : sc.yawPresent) + spun * GALLERY_TURNS[i % GALLERY_TURNS.length],
          s: Math.min((slot.w / 2 - 12) / sc.ext.hx, (slot.h / 2 - 4) / sc.ext.hy),
          ox: slot.x,
          oy: slot.y,
          stick: 0,
          alpha: i === sel ? 1 : phase(t, 100, CREW_IN),
        };
      }
      const p = at(cam, sc.core);
      // diving in, all but the two fade; closing in on the region, all of them kept until its kinds come in
      const kept = area ? gone : !learning || sc === pre || sc === post ? 1 : 1 - at2(0.45);
      return { yaw: look, s: camera.s, ox: p.x, oy: p.y, stick: 1, alpha: kept };
    }),
    mouse: said ? phase(t, hold + 300, DRAW_BACK - 300) : learning ? 1 - at2(0.3) : seeking ? 1 : 0,
    talk: said || seeking || ill ? 1 : learning ? 1 - at2(0) : 0,
    arcs: said ? (stage === 'talk' ? phase(t, 0, 500) : 1) * (1 - phase(t, hold, 1300)) : 0,
    walk: said
      ? phase(t, hold + DRAW_BACK + COMMAND_FOR, WALK_IN)
      : learning
        ? 1 - phase(t, 0, 700)
        : seeking
          ? 1 - phase(t, SEEK_AT + SEEK_FOR - 500, 500)
          : 0,
    go,
    cheese: learning ? phase(t, 300, 400) * (1 - at2(0.3)) : seeking ? 1 : 0,
    pair: learning ? at2(0.4) : 0,
    plastic: pl ? phase(t, CHEESE_FOR + DIVE_FOR - 400, 800) : 0,
    labels: stage === 'gallery' ? phase(t, 300, 600) : 0,
    legend: stage === 'atlas' && room ? phase(t, 700, 600) : 0,
    axonAll: 0,
    aff: 0,
    ills: ill ? ILLS.map((_, k) => phase(t, ILL_AT + k * ILL_EVERY, ILL_IN)) : [],
    zoom: 1,
    pan: 0,
    ions: 0,
    trio: 0,
    others: 0,
    kindsIn: area ? phase(t, KINDS_AT, 700) : 0,
    kinds: area ? phase(t, AREA_AT, AREA_IN) : 0,
    skin: 0,
    near: 0,
    free: 0,
    tags: CLOSE.slice(1).map(() => 0),
    lined: 0,
    volt: 0,
    syn: 0,
    spread: 0,
  };
}

/** The view one of the ten is drawn in: its own — or, `stick` of the way, the pose's camera's — about its dendrites' middle. */
function placeView(p: Place, pose: Pose, cam: View, core: V3, lift: V3 = [0, 0, 0]): View {
  // carried up and down with the brain as the mouse round it walks
  const q = at(cam, add(core, lift));
  const k = p.stick;
  const pitch = PITCH + pose.tilt;
  if (k >= 0.999) return view(pose.yaw, pose.s, core, q.x, q.y, pitch, pose.roll);
  return view(
    turnTo(p.yaw, pose.yaw, k),
    p.s * (pose.s / p.s) ** k,
    core,
    lerp(p.ox, q.x, k),
    lerp(p.oy, q.y, k),
    pitch,
    pose.roll * k
  );
}

/** The mouse's fur, as glass: a warm grey. */
const FUR: RGB = [118, 100, 92];
let mouseHull: Float32Array | null = null;

/** The mouse's shadow on the floor beneath it: its body's and legs' outline seen from above, and its tail's line. */
function mouseShadow(ctx: CanvasRenderingContext2D, v: View, alpha: number, go: number) {
  if (alpha < 0.01) return;
  if (!mouseHull) {
    const { v: pts } = mouseMesh();
    const body: number[] = [];
    for (let i = 0; i < pts.length; i += 3)
      if (pts[i] < TAIL[0][0]) body.push(pts[i], pts[i + 1], pts[i + 2]);
    mouseHull = footprint(Float32Array.from(body));
  }
  const hull = mouseHull;
  const floor = GROUND + 300;
  soften(ctx, 0.2 * alpha, clamp(1200 * v.s, 4, 24), (g) => {
    g.beginPath();
    for (let k = 0; k < hull.length; k += 2) {
      const p = at(v, [hull[k] + go, floor, hull[k + 1]]);
      if (k) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    }
    g.closePath();
    g.fill();
    g.lineWidth = Math.max(1, 1600 * v.s);
    g.beginPath();
    TAIL.forEach(([a, , m], k) => {
      const p = at(v, [a + go, floor, m]);
      if (k) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.stroke();
  });
}

/** Its eyes, the far one dimmer through the glass of its head, and its whiskers — swept `whisk` radians forward. */
function mouseFace(ctx: CanvasRenderingContext2D, v: View, alpha: number, lift: V3, whisk = 0) {
  if (alpha < 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = rgba(INK, 0.3 * alpha);
  ctx.beginPath();
  for (const [a, b] of WHISKERS) {
    // turned about its root, in the plane of AP and ML: each side's forward, towards the nose
    const [da, dm] = [b[0] - a[0], b[2] - a[2]];
    const turn = Math.sign(dm) * whisk;
    const tip: V3 = [
      a[0] + da * Math.cos(turn) - dm * Math.sin(turn),
      b[1],
      a[2] + da * Math.sin(turn) + dm * Math.cos(turn),
    ];
    const p = at(v, add(a, lift));
    const q = at(v, add(tip, lift));
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
  const nearest = Math.min(...EYES.map((e) => depthOf(v, e.at)));
  for (const eye of EYES) {
    const p = at(v, add(eye.at, lift));
    const r = Math.max(1.4, eye.r * v.s);
    const near = depthOf(v, eye.at) <= nearest + 1;
    ctx.fillStyle = rgba([24, 22, 30], (near ? 0.85 : 0.3) * alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (!near) continue;
    ctx.fillStyle = rgba(WHITE, 0.85 * alpha);
    ctx.beginPath();
    ctx.arc(p.x - 0.35 * r, p.y - 0.35 * r, 0.3 * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A rigid move: turned by `rot` (3 × 3, row by row) about `pivot`, then shifted; µm. */
interface Move {
  rot: number[];
  pivot: V3;
  shift: V3;
}
const UNTURNED = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/** Turned `a` radians in the plane of AP and DV — a leg swinging — or in that of AP and ML — a tail swaying. */
const swingBy = (a: number) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const swayBy = (a: number) => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
/** A point, moved as the piece it is on is. */
function moved(p: V3, m: Move): V3 {
  const [x, y, z] = sub(p, m.pivot);
  const r = m.rot;
  return [
    r[0] * x + r[1] * y + r[2] * z + m.pivot[0] + m.shift[0],
    r[3] * x + r[4] * y + r[5] * z + m.pivot[1] + m.shift[1],
    r[6] * x + r[7] * y + r[8] * z + m.pivot[2] + m.shift[2],
  ];
}

/**
 * The mouse `time` ms in, `walk` of the way into its walk and `go` µm on
 * along it: its body rising a little with each step, its legs swinging from
 * the shoulders and hips at a trot — the left front with the right hind, the
 * other two half a stride on — and its tail swaying, once a stride.
 */
function gait(time: number, walk: number, go: number) {
  const stride = (time / STRIDE) * Math.PI * 2;
  const lift: V3 = [go, -260 * walk * Math.abs(Math.sin(stride)), 0];
  return {
    lift,
    body: { rot: UNTURNED, pivot: [0, 0, 0] as V3, shift: lift },
    legs: LEGS.map(
      (leg, i): Move => ({
        rot: swingBy(0.42 * walk * Math.sin(stride + (i === 0 || i === 3 ? 0 : Math.PI))),
        pivot: leg.path[0],
        shift: lift,
      })
    ),
    tail: { rot: swayBy(0.22 * walk * Math.sin(stride / 2)), pivot: TAIL[0], shift: lift },
  };
}

/** A route's length along it, on screen, from its start to each of its points. */
const along = (route: Pt[]) => Array.from(lengths(route));

/** A route on screen with a point every `gap` px along it — so that a pulse's tail, a few points long, stays short. */
function evenly(route: Pt[], gap = 5): Pt[] {
  const out: Pt[] = [route[0]];
  for (let i = 1; i < route.length; i++) {
    const [a, b] = [route[i - 1], route[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / gap));
    for (let k = 1; k <= n; k++)
      out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/**
 * Signals passing among the ten, in the brain: each along an arc bowed up over
 * it from one's soma to another's, in its sender's colour, the receiver lit as
 * it lands — round after round, the ways they take drawn faintly while the
 * view is close enough to follow them.
 */
function talkAmong(
  ctx: CanvasRenderingContext2D,
  crew: (Scene | null)[],
  family: Spec[],
  v: View,
  time: number,
  pose: Pose,
  lift: V3,
  white: boolean
) {
  for (const [fromId, toId, when] of TALK) {
    const [i, j] = [
      family.findIndex((k) => k.id === fromId),
      family.findIndex((k) => k.id === toId),
    ];
    const [a, b] = [crew[i], crew[j]];
    if (!a || !b) continue;
    const alpha = pose.talk * Math.min(pose.crew[i].alpha, pose.crew[j].alpha);
    if (alpha < 0.01) continue;
    const [p, q] = [add(a.soma, lift), add(b.soma, lift)];
    const up = 0.45 * Math.hypot(...sub(q, p));
    const route = Array.from({ length: 25 }, (_, k) => {
      const f = k / 24;
      const u = 1 - f;
      return at(v, [
        u * u * p[0] + 2 * u * f * (p[0] + q[0]) * 0.5 + f * f * q[0],
        u * u * p[1] + 2 * u * f * ((p[1] + q[1]) * 0.5 - up) + f * f * q[1],
        u * u * p[2] + 2 * u * f * (p[2] + q[2]) * 0.5 + f * f * q[2],
      ]);
    });
    const colour = family[i].look.cell;
    if (pose.arcs > 0.01) {
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = rgba(colour, 0.4 * alpha * pose.arcs);
      ctx.beginPath();
      route.forEach((r, k) => (k ? ctx.lineTo(r.x, r.y) : ctx.moveTo(r.x, r.y)));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const d = along(route);
    const round = Math.floor((time - when) / TALK_EVERY);
    for (const r of [round - 1, round]) {
      if (r < 0) continue;
      const start = when + r * TALK_EVERY;
      const f = (time - start) / TALK_FOR;
      if (f > 0 && f < 1) pulse(ctx, route, d, f * d[d.length - 1], colour, 9, alpha, white);
      const landed = (time - start - TALK_FOR) / 500;
      if (landed > 0 && landed < 1)
        glowAt(
          ctx,
          route[route.length - 1],
          8 + 12 * landed,
          family[j].look.cell,
          (1 - landed) * alpha,
          white
        );
    }
  }
}

/**
 * The mouse's nerves, faint inside it — down its spinal cord and out along its
 * legs, and in from its whiskers — and the signals they carry: the command
 * from the motor cortex's neuron out to the legs, just before it walks; and,
 * as it walks, what each pair of paws feels as they land, and what its
 * whiskers feel, up to the thalamus's neuron.
 */
function nerves(
  ctx: CanvasRenderingContext2D,
  crew: (Scene | null)[],
  family: Spec[],
  v: View,
  t: number,
  asked: number,
  pose: Pose,
  g: ReturnType<typeof gait>,
  white: boolean
) {
  if (pose.mouse < 0.01) return;
  const one = (id: string) => {
    const i = family.findIndex((k) => k.id === id);
    return i < 0 ? null : { sc: crew[i], look: family[i].look };
  };
  const [mover, feeler] = [one(MOVER), one(FEELER)];
  const lifted = (p: V3) => add(p, g.lift);
  // each leg's way: down the cord to where its nerve leaves it — the shoulders or the hips — then down the leg
  const legs = LEGS.map((leg, i) => [
    ...SPINE.slice(0, i % 2 === 0 ? 3 : 6).map(lifted),
    ...leg.path.map((p) => moved(p, g.legs[i])),
  ]);
  const whiskers = WHISKER_NERVE.map(lifted);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(INK, 0.15 * pose.mouse);
  ctx.beginPath();
  for (const route of [...legs, whiskers]) {
    route.forEach((p, k) => {
      const q = at(v, p);
      if (k) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
  }
  ctx.stroke();
  ctx.restore();

  const go = (t - asked) / COMMAND_FOR;
  if (mover?.sc && go > 0 && go < 1) {
    for (const leg of legs) {
      const route = evenly([lifted(mover.sc.soma), ...leg].map((p) => at(v, p)));
      const d = along(route);
      pulse(ctx, route, d, go * d[d.length - 1], mover.look.eff, 9, pose.mouse, white);
    }
  }
  if (pose.walk < 0.01) return;
  // as it walks, in and out by turns: each half stride, what the landing paws feel goes up to the thalamus's neuron,
  // and a quarter stride later the motor cortex's command goes out to the pair about to swing
  const walking = asked + COMMAND_FOR;
  const send = (route3: V3[], start: number, travel: number, colour: RGB, r: number) => {
    const u = (t - start) / travel;
    if (u <= 0 || u >= 1) return;
    const route = evenly(route3.map((p) => at(v, p)));
    const d = along(route);
    pulse(ctx, route, d, u * d[d.length - 1], colour, r, pose.walk * pose.mouse, white);
  };
  const half = STRIDE / 2;
  const now = Math.floor((t - walking) / half);
  for (let k = Math.max(0, now - 3); k <= now; k++) {
    const start = walking + k * half;
    const [landing, swinging] =
      k % 2
        ? [
            [1, 2],
            [0, 3],
          ]
        : [
            [0, 3],
            [1, 2],
          ];
    if (feeler?.sc)
      for (const i of landing)
        send(
          [...[...legs[i]].reverse(), lifted(feeler.sc.soma)],
          start,
          SENSE_FOR,
          feeler.look.aff,
          7
        );
    if (mover?.sc)
      for (const i of swinging)
        send([lifted(mover.sc.soma), ...legs[i]], start + half / 2, SENSE_FOR, mover.look.eff, 7);
  }
  // and its whiskers' feel, in, every other stride
  const sniff = Math.floor((t - walking) / (2 * STRIDE));
  if (feeler?.sc)
    for (let k = Math.max(0, sniff - 1); k <= sniff; k++)
      send(
        [...whiskers, lifted(feeler.sc.soma)],
        walking + 300 + k * 2 * STRIDE,
        SENSE_FOR,
        feeler.look.aff,
        7
      );
}

/** A wedge of cheese on the floor in front of the mouse, its point towards it: its top's three corners, and its bottom's; µm. */
function cheeseCorners(): V3[] {
  const top = GROUND - 7000;
  const plan: [number, number][] = [
    [-42000, MID + 1200],
    [-56500, MID - 6800],
    [-55000, MID + 9200],
  ];
  return [...plan.map(([a, m]): V3 => [a, top, m]), ...plan.map(([a, m]): V3 => [a, GROUND, m])];
}
const MID = 5690;
/** Its faces, by corner — the top, the two cut faces, the rind and the bottom — each with holes: where, across and up it, and how big. */
const CHEESE_FACES: { corners: number[]; rind?: boolean; holes: [number, number, number][] }[] = [
  {
    corners: [0, 1, 2],
    holes: [
      [0.45, 0.3, 0.09],
      [0.7, 0.6, 0.07],
    ],
  },
  {
    corners: [0, 1, 4, 3],
    holes: [
      [0.35, 0.55, 0.12],
      [0.7, 0.3, 0.09],
    ],
  },
  {
    corners: [0, 2, 5, 3],
    holes: [
      [0.5, 0.45, 0.1],
      [0.78, 0.7, 0.08],
    ],
  },
  { corners: [1, 2, 5, 4], rind: true, holes: [] },
  {
    corners: [3, 4, 5],
    holes: [
      [0.4, 0.35, 0.09],
      [0.68, 0.55, 0.07],
    ],
  },
];
const CHEESE: RGB = [246, 200, 70];
const RIND: RGB = [226, 152, 44];

/** The cheese, `drop` µm above where it lands: each face that faces the view, lit, its holes darker. */
function drawCheese(ctx: CanvasRenderingContext2D, v: View, alpha: number, drop: number) {
  if (alpha < 0.01) return;
  const corners = cheeseCorners().map((p): V3 => [p[0], p[1] - drop, p[2]]);
  const middle = scale(
    corners.reduce((a, b) => add(a, b), [0, 0, 0] as V3),
    1 / corners.length
  );
  const faces = CHEESE_FACES.map((face) => {
    const pts = face.corners.map((k) => corners[k]);
    let normal = unit(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])), [0, -1, 0]);
    const centre = scale(
      pts.reduce((a, b) => add(a, b), [0, 0, 0] as V3),
      1 / pts.length
    );
    if (dot(normal, sub(centre, middle)) < 0) normal = scale(normal, -1);
    const n = turn(v, normal);
    return { face, pts, n, z: turn(v, sub(centre, v.c))[2] };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const { face, pts, n } of faces.filter((f) => f.n[2] < 0).sort((a, b) => b.z - a.z)) {
    const lit = 0.62 + 0.38 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    const base = face.rind ? RIND : CHEESE;
    const shade = (k: number): RGB =>
      [0, 1, 2].map((j) => Math.min(255, Math.round(base[j] * lit * k))) as RGB;
    ctx.fillStyle = rgba(shade(1), 1);
    ctx.strokeStyle = rgba(shade(0.82), 1);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, k) => {
      const q = at(v, p);
      if (k) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // its holes: circles in the face's plane, across it from its first corner, and up it
    const across = sub(pts[1], pts[0]);
    const up = sub(pts[pts.length - 1], pts[0]);
    const size = Math.min(Math.hypot(...across), Math.hypot(...up));
    const [ua, uu] = [
      unit(across, [1, 0, 0]),
      unit(sub(up, scale(unit(across, [1, 0, 0]), dot(up, unit(across, [1, 0, 0])))), [0, 1, 0]),
    ];
    ctx.fillStyle = rgba(shade(0.78), 1);
    for (const [a, b, r] of face.holes) {
      const c = add(
        pts[0],
        add(scale(across, a), scale(up, b * (face.corners.length === 3 ? 1 - a : 1)))
      );
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        const q = at(
          v,
          add(c, add(scale(ua, Math.cos(ang) * r * size), scale(uu, Math.sin(ang) * r * size)))
        );
        if (k) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Where each disease's name goes, in a space on the page: laid out once for it, largest first, none overlapping. */
interface IllPlace {
  x: number;
  y: number;
  size: number;
  tint: number;
  alpha: number;
}
const illLayouts = new Map<string, (IllPlace | null)[]>();

function layIlls(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  clear: { x: number; y: number; hw: number; hh: number }[]
) {
  const rnd = mulberry32(2026);
  const taken = [...clear];
  return ILLS.map((name, k): IllPlace | null => {
    // the commonest biggest, then a middling size, then the rest — and, with no room left for one, a little smaller
    let size = k < 6 ? 24 - 0.7 * k : k < 16 ? 18 - 0.25 * (k - 6) : 14 - 0.5 * (k % 3);
    for (let shrink = 0; shrink < 4; shrink++, size *= 0.9) {
      ctx.font = `italic ${size}px ${SERIF}`;
      const hw = ctx.measureText(name).width / 2 + 10;
      const hh = size * 0.6 + 5;
      for (let tries = 0; tries < 600; tries++) {
        const x = x0 + hw + rnd() * Math.max(0, x1 - x0 - 2 * hw);
        const y = y0 + hh + rnd() * Math.max(0, y1 - y0 - 2 * hh);
        if (taken.some((b) => Math.abs(b.x - x) < b.hw + hw && Math.abs(b.y - y) < b.hh + hh))
          continue;
        taken.push({ x, y, hw, hh });
        // most in ink, some in the neuron's colours; the smaller, the fainter
        const tint = rnd() < 0.6 ? 0 : 1 + Math.floor(rnd() * 4);
        return { x, y, size, tint, alpha: (k < 6 ? 0.95 : k < 16 ? 0.85 : 0.7) - 0.1 * rnd() };
      }
    }
    return null;
  });
}

/**
 * The diseases, named over the page — or, not spilling over it, over the
 * figure's box — round `main`'s brain, in the middle, each as much as `shown`
 * has it, rising a little into place, then drifting.
 */
function drawIlls(
  ctx: CanvasRenderingContext2D,
  main: Scene,
  shown: number[],
  look: Look,
  w: number,
  h: number,
  now: number
) {
  if (!shown.some((a) => a > 0.01)) return;
  // clear of the arrows either side of the figure and of the dots beneath it — and as far above it as that is
  // below, so the brain is in their middle, short of the words over it
  const below = Math.max(0, seen.y1 - 64 - h);
  const [x0, y0, x1, y1] = seen.spill
    ? [seen.x0 + 56, -Math.max(0, below - 14), seen.x1 - 56, h + below]
    : [12, 8, w - 12, h - 8];
  // and of the brain, and the credits under it
  const { s } = illCamera(main, w, h);
  const clear = [
    { x: w / 2, y: h / 2, hw: main.brainExt.hx * s + 30, hh: main.brainExt.hy * s + 18 },
    { x: 230, y: h - 22, hw: 230, hh: 24 },
  ];
  const key = [x0, y0, x1, y1, ...clear.flatMap((c) => [c.x, c.y, c.hw, c.hh])]
    .map(Math.round)
    .join(',');
  let placed = illLayouts.get(key);
  if (!placed) {
    placed = layIlls(ctx, x0, y0, x1, y1, clear);
    illLayouts.set(key, placed);
  }
  const tints = [look.text, look.cell, look.soma, look.aff, look.eff];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  placed.forEach((p, k) => {
    const a = shown[k] ?? 0;
    if (!p || a < 0.01) return;
    ctx.font = `italic ${p.size}px ${SERIF}`;
    ctx.fillStyle = rgba(tints[p.tint], a * p.alpha);
    ctx.fillText(ILLS[k], p.x, p.y + 8 * (1 - a) + 2.5 * Math.sin(now / 2300 + k * 1.7));
  });
  ctx.restore();
}

/** How many times as long as it is wide the branch drawn in on is, at least, where the dendrogram has one. */
const FOCUS_LONG = 9;
/** The piece of dendrite the view draws in on, in a dendrogram: the middle of a long branch near the soma's level. */
const foci = new WeakMap<Tree, { x: number; y: number; width: number }>();
function focusOf(sc: Scene, layout: Tree, s: number) {
  const known = foci.get(layout);
  if (known) return known;
  const { n, diam } = sc;
  const drawn = (i: number) => Math.min(18, Math.max(0.7, diam[i] * exaggerate(s) * s));
  // each branch's run, by the level it is laid out at: how far along it goes, and its segments
  const runs = new Map<number, { lo: number; hi: number; y: number; nodes: number[] }>();
  for (let i = 1; i < n.x.length; i++) {
    const p = n.parent[i];
    if (
      p === 0 ||
      n.type[i] === 2 ||
      n.type[p] === 2 ||
      Math.abs(layout.ty[i] - layout.ty[p]) > 0.5
    )
      continue;
    const key = Math.round(layout.ty[i] * 4);
    const run = runs.get(key) ?? { lo: Infinity, hi: -Infinity, y: layout.ty[i], nodes: [] };
    run.lo = Math.min(run.lo, layout.tx[i], layout.tx[p]);
    run.hi = Math.max(run.hi, layout.tx[i], layout.tx[p]);
    run.nodes.push(i);
    runs.set(key, run);
  }
  let best = { x: layout.tx[0], y: layout.ty[0], width: 1 };
  let score = -Infinity;
  for (const run of runs.values()) {
    const x = (run.lo + run.hi) / 2;
    // as wide as it is drawn at its middle, where the view draws in on it
    const at = run.nodes.find(
      (i) =>
        Math.min(layout.tx[i], layout.tx[n.parent[i]]) <= x &&
        x <= Math.max(layout.tx[i], layout.tx[n.parent[i]])
    );
    const width = drawn(at ?? run.nodes[0]);
    // long for how wide it is — drawn in until it is the band's height, it still runs across the figure, its forks
    // out of sight — and, of those, the thickest near the soma's level; failing any, the longest for its width
    const long = (run.hi - run.lo) / width;
    const here =
      long >= FOCUS_LONG
        ? 1e6 + 20 * width - 0.6 * Math.abs(run.y - layout.ty[0])
        : Math.min(long, FOCUS_LONG);
    if (here > score) [score, best] = [here, { x, y: run.y, width }];
  }
  foci.set(layout, best);
  return best;
}

/** The figure drawn in on the dendrogram's piece of dendrite, `pose.zoom` times as big, `pose.pan` of the way to its middle. */
function zoomIn(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  layout: Tree,
  pose: Pose,
  w: number,
  th: number
) {
  const f = focusOf(sc, layout, pose.s);
  ctx.translate(lerp(f.x, w / 2, pose.pan), lerp(f.y, th / 2, pose.pan));
  ctx.scale(pose.zoom, pose.zoom);
  ctx.translate(-f.x, -f.y);
}

/** Charge, told by colour alone: positive red, negative blue; and every ion drawn the one size, px, so it is not told by size. */
const POSITIVE: RGB = [214, 50, 58];
const NEGATIVE: RGB = [38, 98, 214];
const ION_R = 5.4;
/** An ion as drawn: its charge's colour, its size and its sign. */
type Charge = { colour: RGB; r: number; sign: string };
const CATION: Charge = { colour: POSITIVE, r: ION_R, sign: '+' };
const ANION: Charge = { colour: NEGATIVE, r: ION_R, sign: '−' };
/**
 * The charge lining the membrane at rest: a pair every LINING_EVERY px along
 * each membrane — a negative ion inside, a positive one outside, each LINING_AT
 * px from its middle, as first set down (see ION_SCALE) — each a little off its
 * place, so that they do not read as rows.
 */
const LINING_EVERY = 50;
const LINING_AT = 14;
/**
 * Under the dendrite, the voltage across its membrane at each place along it,
 * mV: V_REST at rest; the plot running from V_LOW at its foot to V_HIGH at its
 * head, PLOT_H px tall at most.
 */
const V_REST = -70;
const V_LOW = -78;
const V_HIGH = -48;
const PLOT_H = 96;
/** A voltage as read off the plot: whole millivolts, and a real minus. */
const millivolts = (v: number) => `${Math.round(v) < 0 ? '−' : ''}${Math.abs(Math.round(v))} mV`;

/**
 * The piece of dendrite close in, `alpha` of it, a slide at a time: across the
 * middle of the figure, a band in the dendrite's colour, as the branch drawn in
 * on has become; then, `skin` of it, its membrane — the band's edges two layers
 * of lipid, a lens over a few of them on the slide about them; and on the next,
 * the inside of the dendrite between them and the space round it outside, each
 * named; then, `free` of them, ions of both kinds wandering either side of it;
 * then, `lined` of them, the slight excess of charge lining it either side at
 * rest — negative ions inside, positive ones out — and, `volt` of it, under the
 * dendrite, the voltage that charge makes across the membrane at each place
 * along it. Then, `syn` of it, a synapse onto the dendrite from another neuron:
 * now and then, by `clock` — the slide's own time, which waits for its words —
 * a spike down that neuron's axon, and positive ions coming in through the
 * synapse after it, the charge across the membrane there, and so the voltage,
 * changing with them; and, `spread` of it, that charge spreading along the
 * dendrite, the voltage with it. Each slide's own names show as `tags` has
 * them.
 */
type Close = Pick<Pose, 'skin' | 'near' | 'free' | 'lined' | 'volt' | 'syn' | 'spread' | 'tags'>;
function drawIons(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  look: Look,
  w: number,
  th: number,
  now: number,
  close: Close,
  clock: number
) {
  if (alpha < 0.01) return;
  const { skin, near, free, lined, volt, syn, spread } = close;
  // how much a slide's own names show
  const own = (stage: (typeof CLOSE)[number]) => close.tags[CLOSE.indexOf(stage) - 1] ?? 0;
  const z = ION_SCALE;
  const [x0, x1] = seen.spill ? [seen.x0, seen.x1] : [0, w];
  const span = x1 - x0;
  const half = (ION_BAND * th) / 2;
  const mid = th / 2;
  // over the page, as far above the figure as below it — short of the words over it and the dots under it — and
  // the key at the top of that
  const below = Math.max(0, seen.y1 - 64 - th);
  const [top, foot] = seen.spill ? [-Math.max(0, below - 14), th + below] : [0, th];
  const ky = seen.spill ? top + 12 : 18;
  // the top membrane has the outside above it, the bottom one below — closer in, on the ions' slides, the top one
  // across the middle and the bottom one gone from below: drawn the same size, so a smaller piece of the dendrite
  const deep = smooth(near);
  const membranes = [lerp(mid - half, mid, deep), lerp(mid + half, mid + 6 * half, deep)];
  const white = !!look.white;
  const ink = white ? INK : WHITE;
  const halo = look.bg[1];

  // the synapse: where along the dendrite, onto the top membrane; and each spike down the other neuron's axon so
  // far, ms since it set off — the ions it lets in coming after it, once it has reached the synapse
  const xs = x0 + 0.34 * span;
  const comes = SYN_SPIKE + SYN_RELEASE;
  const spikes: number[] = [];
  if (syn > 0.01)
    for (
      let k = Math.max(0, Math.floor((clock - SYN_AT) / SYN_EVERY) - 1);
      SYN_AT + k * SYN_EVERY <= clock;
      k++
    )
      spikes.push(clock - SYN_AT - k * SYN_EVERY);
  // the charge a spike has let in, ms since it began to come in: how much of it is still there — rising, then
  // dying away through the membrane — and how far across it has spread, px; the voltage it makes the lower, the
  // further it has spread
  const lift = (since: number) =>
    since <= 0
      ? 0
      : smooth(clamp01(since / SYN_RISE_FOR)) *
        Math.exp(-Math.max(0, since - SYN_RISE_FOR) / SYN_TAU);
  const across = (since: number) =>
    SYN_WIDTH * z * Math.sqrt(1 + (spread * Math.max(0, since)) / SYN_SPREAD);
  const voltageAt = (x: number) =>
    spikes.reduce((v, at) => {
      const wide = across(at - comes);
      return (
        v +
        SYN_RISE *
          lift(at - comes) *
          ((SYN_WIDTH * z) / wide) *
          Math.exp(-0.5 * ((x - xs) / wide) ** 2)
      );
    }, V_REST);
  // how much of the charge at rest is still at x: the less, the higher the voltage there
  const kept = (x: number) => 1 - 0.8 * clamp01((voltageAt(x) - V_REST) / SYN_RISE);

  ctx.save();
  ctx.globalAlpha = alpha;
  // over the dendrogram drawn in on it, the page — drawn solid beneath, its branches seen through would show where
  // their pieces overlap
  ctx.fillStyle = rgba(white ? WHITE : look.bg[0], 1);
  ctx.fillRect(seen.x0, seen.y0, seen.x1 - seen.x0, seen.y1 - seen.y0);
  // the inside of the dendrite: its colour, as the branch drawn in on — and, its membrane drawn, only faintly
  ctx.fillStyle = rgba(look.cell, lerp(1, white ? 0.07 : 0.12, skin));
  ctx.fillRect(x0, membranes[0], span, membranes[1] - membranes[0]);
  // the membranes: two layers of lipid, heads out and tails in — giving way, in the top one, to the synapse's channel
  const lipids = [0, 1].map(() => ({ heads: new Path2D(), tails: new Path2D() }));
  for (const y of membranes) {
    for (let x = x0 + 3 * z; x < x1; x += 6.5 * z) {
      const { heads, tails } = lipids[y === membranes[0] && Math.abs(x - xs) < 15 * z ? 1 : 0];
      for (const side of [-1, 1]) {
        heads.moveTo(x + 2.6 * z, y + side * 7 * z);
        heads.arc(x, y + side * 7 * z, 2.6 * z, 0, Math.PI * 2);
        for (const dx of [-z, z]) {
          tails.moveTo(x + dx, y + side * 4.6 * z);
          tails.lineTo(x + dx, y + side * 0.8 * z);
        }
      }
    }
  }
  lipids.forEach(({ heads, tails }, gap) => {
    const a = skin * (gap ? 1 - syn : 1);
    if (a < 0.01) return;
    ctx.globalAlpha = alpha * a;
    ctx.strokeStyle = rgba(ink, 0.22);
    ctx.lineWidth = 0.8 * z;
    ctx.stroke(tails);
    ctx.fillStyle = rgba(mix(look.cell, WHITE, white ? 0.35 : 0.1), 0.9);
    ctx.fill(heads);
  });
  const dot = (x: number, y: number, ion: Charge, a: number) => {
    if (a < 0.01) return;
    ctx.globalAlpha = alpha * a;
    ctx.beginPath();
    ctx.arc(x, y, ion.r * z, 0, Math.PI * 2);
    ctx.fillStyle = rgba(ion.colour, 0.92);
    ctx.fill();
    ctx.fillStyle = rgba(WHITE, 0.95);
    ctx.font = `bold ${Math.round(ion.r * 1.7 * z)}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ion.sign, x, y + 0.5 * z);
  };
  // an arrow from `a` to `b`
  const arrow = (a: Pt, b: Pt, colour: RGB, shown: number, width = 1.5 * z) => {
    if (shown < 0.01) return;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const head = 2.9 * width;
    ctx.globalAlpha = alpha * shown;
    ctx.strokeStyle = ctx.fillStyle = rgba(colour, 1);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x - Math.cos(angle) * head * 0.7, b.y - Math.sin(angle) * head * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(angle - 0.45), b.y - head * Math.sin(angle - 0.45));
    ctx.lineTo(b.x - head * Math.cos(angle + 0.45), b.y - head * Math.sin(angle + 0.45));
    ctx.fill();
  };

  // ions of both kinds either side of the membrane — inside the dendrite and out in the space round it — clear of
  // where the charge lining it at rest goes, each wandering, and coming in one after another as they show; as many
  // of one kind as of the other
  if (free > 0.01) {
    const clear = 26 * z;
    const regions: [number, number][] = [
      [top + 14, membranes[0] - clear],
      [membranes[0] + clear, membranes[1] - clear],
      [membranes[1] + clear, foot - 14],
    ];
    const rnd = mulberry32(911);
    regions.forEach(([from, to]) => {
      // only what shows: closer in, most of the inside is below the figure
      const [y0, y1] = [Math.max(from, top + 14), Math.min(to, foot - 14)];
      if (y1 - y0 < 8) return;
      const n = Math.round((span * (y1 - y0)) / (90 * 90));
      for (let i = 0; i < n; i++) {
        const [px, py, p, q, late] = [rnd(), rnd(), rnd() * 6.3, rnd() * 6.3, rnd()];
        const x = x0 + px * span + 4 * z * Math.sin(now / 1300 + p);
        const y = y0 + py * (y1 - y0) + 3 * z * Math.sin(now / 1700 + q);
        dot(x, y, i % 2 ? ANION : CATION, clamp01(free * 1.6 - late * 0.6));
      }
    });
  }

  // the charge lining the membrane: in pairs across it, a negative ion inside and a positive one out, each coming in
  // to its place as it shows — thinned where charge has come in through the synapse, as much as the voltage there has
  // risen; and none where the synapse is
  if (lined > 0.01) {
    const settle = smooth(lined);
    membranes.forEach((y, m) => {
      // out of the dendrite: up through the top membrane, down through the bottom one
      const out = m ? 1 : -1;
      const off = mulberry32(77 + m);
      for (let j = 0, x = x0 + 9 * z; x < x1; j++, x += LINING_EVERY * z) {
        const [ax, ay, cx, cy] = [off() - 0.5, off() - 0.5, off() - 0.5, off() - 0.5];
        const clear = m ? 1 : 1 - syn * (1 - smooth((Math.abs(x - xs) - 22 * z) / (10 * z)));
        const a = lined * kept(x) * clear;
        if (a < 0.01) continue;
        const wiggle = (k: number) => 2.4 * z * Math.sin(now / 900 + j * 1.7 + k);
        const far = (dy: number) => (LINING_AT + 4 * dy + 12 * (1 - settle)) * z;
        dot(
          x + ax * 0.25 * LINING_EVERY * z + wiggle(0),
          y - out * far(ay) + 0.6 * wiggle(1),
          ANION,
          a
        );
        dot(
          x + cx * 0.25 * LINING_EVERY * z + wiggle(4),
          y + out * far(cy) + 0.6 * wiggle(5),
          CATION,
          a
        );
      }
    });
  }

  // the synapse: the other neuron's axon, down from above to its end on the dendrite, a bouton full of vesicles of
  // transmitter, over a channel in the membrane that the transmitter opens; a spike down the axon now and then, the
  // transmitter crossing to the channel, and positive ions coming in through it — in the dendrite, staying near the
  // synapse or spreading along it, as the voltage does, and fading as the charge dies away
  const m0 = membranes[0];
  const knob = { x: xs, y: m0 - 34 * z };
  const [rx, ry] = [19 * z, 12 * z];
  const from = { x: xs + 0.12 * span, y: top - 30 };
  const bend = { x: xs + 0.015 * span, y: (from.y + knob.y - ry) / 2 };
  const onAxon = (u: number): Pt => {
    const v = 1 - u;
    return {
      x: v * v * from.x + 2 * v * u * bend.x + u * u * knob.x,
      y: v * v * from.y + 2 * v * u * bend.y + u * u * (knob.y - ry),
    };
  };
  if (syn > 0.01) {
    const deep = mix(look.aff, [0, 0, 0], 0.3);
    ctx.globalAlpha = alpha * syn;
    ctx.strokeStyle = rgba(look.aff, 0.9);
    ctx.lineWidth = 3 * z;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const p = onAxon(k / 24);
      if (k) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(knob.x, knob.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(look.aff, WHITE, white ? 0.3 : 0), 0.95);
    ctx.fill();
    ctx.strokeStyle = rgba(deep, 0.9);
    ctx.lineWidth = 1.2 * z;
    ctx.stroke();
    for (const [vx, vy] of [
      [-10, -3],
      [-3, 3],
      [5, -4],
      [11, 2],
      [1, -7],
    ]) {
      ctx.beginPath();
      ctx.arc(knob.x + vx * z, knob.y + vy * z, 2.5 * z, 0, Math.PI * 2);
      ctx.fillStyle = rgba(WHITE, 0.9);
      ctx.fill();
      ctx.strokeStyle = rgba(deep, 0.6);
      ctx.lineWidth = 0.8 * z;
      ctx.stroke();
    }
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(xs + (side * 7.5 - 5) * z, m0 - 15 * z, 10 * z, 30 * z, 4.5 * z);
      ctx.fillStyle = rgba(mix(ink, WHITE, white ? 0.78 : 0.3), 0.95);
      ctx.fill();
      ctx.strokeStyle = rgba(ink, 0.45);
      ctx.lineWidth = 1.1 * z;
      ctx.stroke();
    }
    for (const at of spikes) {
      // down the axon
      if (at < SYN_SPIKE) glowAt(ctx, onAxon(at / SYN_SPIKE), 13 * z, look.aff, syn, white);
      // at the bouton, which lets its transmitter go across the gap to the channel, opening it
      const r = (at - SYN_SPIKE) / SYN_RELEASE;
      if (r > -0.3 && r < 2.5)
        glowAt(ctx, knob, 26 * z, look.aff, syn * (1 - clamp01(r / 2.5)), white);
      if (r > 0 && r < 1.3) {
        ctx.globalAlpha = alpha * syn * (1 - smooth((r - 1) / 0.3));
        ctx.fillStyle = rgba(deep, 1);
        for (const dx of [-12, -6, 0, 6, 12]) {
          ctx.beginPath();
          ctx.arc(
            xs + dx * z * (1 - 0.7 * clamp01(r)),
            lerp(knob.y + ry, m0 - 9 * z, clamp01(r)),
            1.5 * z,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      // then the positive ions, one after another, in through it
      const rnd = mulberry32(1013);
      for (let i = 0; i < SYN_IONS; i++) {
        const [dir, how, deepIn, ph] = [
          rnd() < 0.5 ? -1 : 1,
          0.35 + 0.65 * rnd(),
          rnd(),
          rnd() * 6.3,
        ];
        const u = (at - comes - i * SYN_ION_EVERY) / SYN_ION_FOR;
        if (u < 0) continue;
        if (u <= 1) {
          dot(
            xs + 2 * z * Math.sin(u * 9),
            lerp(m0 - 30 * z, m0 + 26 * z, smooth(u)),
            CATION,
            syn * Math.min(1, 5 * u)
          );
          continue;
        }
        const since = (u - 1) * SYN_ION_FOR;
        const x = xs + dir * how * 2 * across(at - comes) * smooth(clamp01(since / 700));
        const y = lerp(m0 + 26 * z, m0 + (26 + 34 * deepIn) * z, smooth(clamp01(since / 700)));
        dot(
          x,
          y + 2.5 * z * Math.sin(now / 700 + ph),
          CATION,
          syn * clamp01(1.6 * lift(at - comes))
        );
      }
    }
  }

  // under the dendrite, the voltage across its membrane at each place along it: at rest the same all along; where
  // charge has come in, higher — a few places along it read off, each straight below where it is on the dendrite
  if (volt > 0.01) {
    const head = membranes[1] + (LINING_AT + 12) * z;
    const feet = Math.min(foot - 10, head + PLOT_H);
    const yOf = (v: number) => feet - ((v - V_LOW) / (V_HIGH - V_LOW)) * (feet - head);
    const rest = yOf(V_REST);
    const curve: Pt[] = [];
    for (let x = x0; x <= x1 + 3; x += 4) curve.push({ x, y: yOf(voltageAt(x)) });
    ctx.globalAlpha = alpha * volt;
    // the axis, and the level at rest
    ctx.strokeStyle = rgba(ink, 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, feet);
    ctx.lineTo(x1, feet);
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = rgba(ink, 0.3);
    ctx.beginPath();
    ctx.moveTo(x0, rest);
    ctx.lineTo(x1, rest);
    ctx.stroke();
    ctx.setLineDash([]);
    // where it has risen, shaded the colour of the charge come in
    ctx.beginPath();
    ctx.moveTo(x0, rest);
    for (const p of curve) ctx.lineTo(p.x, Math.min(p.y, rest));
    ctx.lineTo(x1, rest);
    ctx.closePath();
    ctx.fillStyle = rgba(POSITIVE, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.85);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    curve.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    // read off at a few places: down from the membrane to the plot, a dot, and the voltage there — one of them just
    // along from the synapse, which the voltage reaches only as the charge spreads
    for (const x of [x0 + 0.12 * span, xs, xs + 0.08 * span, x0 + 0.8 * span]) {
      const v = voltageAt(x);
      const y = yOf(v);
      ctx.globalAlpha = alpha * volt;
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = rgba(ink, 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, membranes[1] + 8 * z);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(ink, 0.9);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      tag(ctx, millivolts(v), x + 7, y - 10, ink, halo, 0.85, 11.5);
    }
    ctx.globalAlpha = alpha * volt;
    tag(
      ctx,
      'the voltage across the membrane, at each place along the dendrite',
      w - 14,
      head + 6,
      ink,
      halo,
      0.8,
      12,
      'right'
    );
  }

  // what is what: the charge, keyed at the top; and each slide's own names
  const keyed = Math.max(free, lined);
  if (keyed > 0.01) {
    ctx.globalAlpha = alpha * keyed;
    for (const [ion, name, row] of [
      [CATION, 'positive charge', 0],
      [ANION, 'negative charge', 1],
    ] as const) {
      dot(w - 148, ky + row * 20, ion, keyed);
      ctx.globalAlpha = alpha * keyed;
      tag(ctx, name, w - 134, ky + row * 20, ink, halo, 0.85, 12);
    }
  }
  ctx.globalAlpha = alpha;
  const beyond = (LINING_AT + 21) * z;
  const atRest = Math.max(own('imbalance'), own('voltage'));
  tag(
    ctx,
    'a slight excess of positive charge outside the membrane',
    14,
    m0 - beyond,
    POSITIVE,
    halo,
    0.95 * atRest,
    12
  );
  tag(ctx, 'and of negative charge inside it', 14, m0 + beyond, NEGATIVE, halo, 0.95 * atRest, 12);
  const toldSyn = syn * own('synapse');
  if (toldSyn > 0.01) {
    tag(
      ctx,
      'a synapse: a connection from another neuron',
      knob.x + rx + 12,
      knob.y,
      ink,
      halo,
      0.85 * toldSyn,
      12
    );
    const p = onAxon(0.3);
    tag(ctx, "that neuron's axon", p.x + 14, p.y, ink, halo, 0.7 * toldSyn, 12);
    tag(
      ctx,
      'a signal from it lets positive charge in',
      xs + 44 * z,
      m0 + 50 * z,
      POSITIVE,
      halo,
      0.9 * toldSyn,
      12
    );
  }
  const toldSpread = syn * own('spread');
  if (toldSpread > 0.01) {
    const y = mid + 12 * z;
    tag(
      ctx,
      'the charge spreads along the dendrite',
      xs,
      y + 22 * z,
      POSITIVE,
      halo,
      0.9 * toldSpread,
      12,
      'center'
    );
    arrow({ x: xs - 60 * z, y }, { x: xs - 120 * z, y }, POSITIVE, 0.8 * toldSpread);
    arrow({ x: xs + 60 * z, y }, { x: xs + 120 * z, y }, POSITIVE, 0.8 * toldSpread);
  }
  // on the lipids' slide, a lens over a few of them, drawn out large: each a round head, which water suits, and two
  // fatty tails, which it does not — the two layers back to back, heads out and tails in
  const lens = own('lipids') * smooth(clamp01((clock - LENS_AT) / LENS_IN));
  if (lens > 0.01) {
    const spot = { x: 0.5 * w - 30, y: membranes[0] };
    const centre = { x: 0.5 * w + 100, y: mid + 8 };
    const r = 62 * (0.7 + 0.3 * smooth(lens));
    const sr = 15;
    // the cone out from the spot magnified to the lens
    const [dx, dy] = [centre.x - spot.x, centre.y - spot.y];
    const [nx, ny] = [-dy / Math.hypot(dx, dy), dx / Math.hypot(dx, dy)];
    ctx.globalAlpha = alpha * lens;
    ctx.strokeStyle = rgba(ink, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(spot.x + side * nx * sr, spot.y + side * ny * sr);
      ctx.lineTo(centre.x + side * nx * r, centre.y + side * ny * r);
    }
    ctx.moveTo(spot.x + sr, spot.y);
    ctx.arc(spot.x, spot.y, sr, 0, Math.PI * 2);
    ctx.stroke();
    // in the lens, the page, and on it the lipids large: the tails in from each head, kinked
    ctx.save();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(white ? WHITE : look.bg[0], 1);
    ctx.fill();
    ctx.clip();
    const head = mix(look.cell, WHITE, white ? 0.35 : 0.1);
    for (let i = -3; i <= 3; i++) {
      const x = centre.x + i * 22;
      for (const side of [-1, 1]) {
        ctx.strokeStyle = rgba(ink, 0.45);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const off of [-3.5, 3.5]) {
          ctx.beginPath();
          ctx.moveTo(x + off, centre.y + side * 19);
          ctx.lineTo(x + off, centre.y + side * 11);
          ctx.lineTo(x + off * 1.9, centre.y + side * 3);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, centre.y + side * 27, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(head, 0.95);
        ctx.fill();
        ctx.strokeStyle = rgba(ink, 0.4);
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = alpha * lens;
    ctx.strokeStyle = rgba(ink, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, r, 0, Math.PI * 2);
    ctx.stroke();
    const tx = centre.x + r + 16;
    tag(ctx, 'lipids: fat molecules', tx, centre.y - 22, ink, halo, 0.95, 12.5);
    tag(ctx, 'in two layers, back to back: heads out,', tx, centre.y, ink, halo, 0.75, 11.5);
    tag(ctx, 'where the water is, and fatty tails in', tx, centre.y + 17, ink, halo, 0.75, 11.5);
  }
  // which is which: the membrane, named above the top one and below the bottom, a tick down onto each; and, from the
  // slide after the lipids', what it keeps apart — the inside and the outside
  const OUTSIDE = 'outside the cell: the extracellular space';
  const INSIDE = 'inside the neuron';
  const MEMBRANE = 'cell membrane';
  ctx.globalAlpha = alpha * skin * Math.max(own('membrane'), own('charges'));
  tag(ctx, OUTSIDE, 14, membranes[0] - 26 * z, ink, halo, 0.75, 12);
  tag(
    ctx,
    INSIDE,
    14,
    Math.min((membranes[0] + membranes[1]) / 2, membranes[0] + 60 * z),
    ink,
    halo,
    0.75,
    12
  );
  ctx.globalAlpha = alpha * skin * Math.max(own('lipids'), own('membrane'), own('charges'));
  ctx.font = `italic 12px ${SERIF}`;
  const wide = ctx.measureText(MEMBRANE).width;
  for (const [y, side] of [
    [membranes[0], -1],
    [membranes[1], 1],
  ]) {
    tag(ctx, MEMBRANE, w - 14, y + side * 30 * z, ink, halo, 0.75, 12, 'right');
    // (the tick's stroke set after the name, whose halo is a stroke of its own)
    ctx.strokeStyle = rgba(ink, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 14 - wide / 2, y + side * 22 * z);
    ctx.lineTo(w - 14 - wide / 2, y + side * 11 * z);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * One region's kinds of neuron: the 26 morphological types Markram et al.
 * (2015) found in the rat's somatosensory cortex — each once, not once for
 * every layer it is found in — side by side as the ten are on the gallery's
 * slide: the interneurons in a row above, the pyramidal cells in a row below.
 * One real cell of each, drawn small and turning its own way, in a colour of
 * its own — the interneurons' cool, the pyramidal cells' warm — its dendrites
 * in that colour and its axon paler; and under it its name.
 */
const KIND_NAMES: Record<string, string> = {
  DAC: 'Descending axon cell',
  'NGC-DA': 'Neurogliaform cell, dense axon',
  'NGC-SA': 'Neurogliaform cell, slender axon',
  HAC: 'Horizontal axon cell',
  LAC: 'Large axon cell',
  SAC: 'Small axon cell',
  MC: 'Martinotti cell',
  BTC: 'Bitufted cell',
  DBC: 'Double bouquet cell',
  BP: 'Bipolar cell',
  NGC: 'Neurogliaform cell',
  LBC: 'Large basket cell',
  NBC: 'Nest basket cell',
  SBC: 'Small basket cell',
  ChC: 'Chandelier cell',
  PC: 'Pyramidal cell',
  SP: 'Star pyramidal cell',
  SS: 'Spiny stellate cell',
  TTPC1: 'Thick-tufted pyramidal, late tuft',
  TTPC2: 'Thick-tufted pyramidal, early tuft',
  UTPC: 'Untufted pyramidal cell',
  STPC: 'Slender-tufted pyramidal cell',
  'TPC-L4': 'Tufted pyramidal, tuft in layer 4',
  'TPC-L1': 'Tufted pyramidal, tuft in layer 1',
  IPC: 'Inverted pyramidal cell',
  BPC: 'Bipolar pyramidal cell',
};
const PYRAMIDAL_KINDS = [
  'PC',
  'SP',
  'SS',
  'TTPC1',
  'TTPC2',
  'UTPC',
  'STPC',
  'TPC-L4',
  'TPC-L1',
  'IPC',
  'BPC',
];
/** The two rows' names, and what each kind does to the neurons it reaches. */
const KIND_GROUPS: [string, string][] = [
  ['Interneurons', 'inhibitory'],
  ['Pyramidal cells', 'excitatory'],
];
/** Each kind's colour: round the cool hues for the interneurons, the warm for the pyramidal cells, neighbours far apart. */
const KIND_HUES: [number, number][] = [
  [160, 290],
  [-25, 50],
];
/** Under each cell, room for its name on up to three lines; and under the rows, for whose they are. */
const KIND_NAMED = 42;
const KIND_FOOT = 22;
/** How fast each turns about the line up through it, rad/s, at the least and at the most. */
const KIND_SPIN: [number, number] = [0.15, 0.45];
/** One kind's cell: where it goes, its colour, and its nodes — µm, the soma at 0, y towards the pia. */
interface Kind {
  group: number;
  index: number;
  type: string;
  colour: RGB;
  x: Int16Array;
  y: Int16Array;
  z: Int16Array;
  t: Uint8Array;
  p: Int32Array;
  /** The line up through its middle it turns about; its height; and how far it reaches round from that line. */
  mid: [number, number, number];
  tall: number;
  round: number;
  /** Its own turning: rad/s, either way, and from where. */
  spin: number;
  start: number;
  /** How deep under the pia its layer's cells sit, µm. */
  depth: number;
}
/** How deep each layer's cells sit, µm under the pia, the rat's (Markram et al., 2015). */
const KIND_DEPTH: Record<string, number> = { I: 120, 'II/III': 420, IV: 760, V: 1100, VI: 1600 };
/**
 * Within the brain, as the view closes in: how far from the soma it closes in
 * on the kinds' places are looked for, µm; and how big they are drawn there,
 * for the brain's scale — smaller than they are, the rat's cells in a mouse's
 * cortex, to fit within it.
 */
const KINDS_NEAR = 1000;
const KINDS_SHRINK = 0.5;
/** A colour from hue, saturation and lightness: degrees, and 0–1. */
function hsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as RGB;
}
let kindCells: Kind[] | null = null;
let kindsAsked = false;
/** The 26, fetched once. */
function loadKinds() {
  if (kindsAsked) return;
  kindsAsked = true;
  fetch('/static/learn/heuristics/mtypes.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`mtypes: ${r.status}`))))
    .then(
      (d: {
        cells: {
          row: string;
          type: string;
          x: number[];
          y: number[];
          z: number[];
          t: number[];
          p: number[];
        }[];
      }) => {
        const counts = [0, 0];
        const rnd = mulberry32(55);
        const groupOf = (type: string) => (PYRAMIDAL_KINDS.includes(type) ? 1 : 0);
        const sizes = [0, 1].map((g) => d.cells.filter((c) => groupOf(c.type) === g).length);
        kindCells = d.cells.map((c) => {
          const group = groupOf(c.type);
          const index = counts[group]++;
          // neighbours' hues far apart: stepping round the group's range by a stride that shares nothing with its count
          const n = sizes[group];
          const stride = [7, 5, 4, 3].find((k) => n % k !== 0 && k < n) ?? 1;
          const [lo, hi] = KIND_HUES[group];
          const hue = lo + ((hi - lo) * ((index * stride) % n)) / Math.max(1, n - 1);
          const colour = hsl((hue + 360) % 360, group ? 0.72 : 0.6, index % 2 ? 0.42 : 0.5);
          const mid: [number, number, number] = [
            (Math.min(...c.x) + Math.max(...c.x)) / 2,
            (Math.min(...c.y) + Math.max(...c.y)) / 2,
            (Math.min(...c.z) + Math.max(...c.z)) / 2,
          ];
          let round = 1;
          for (let j = 0; j < c.x.length; j++)
            round = Math.max(round, Math.hypot(c.x[j] - mid[0], c.z[j] - mid[2]));
          const [a, b, e] = [rnd(), rnd(), rnd()];
          return {
            group,
            index,
            type: c.type,
            colour,
            x: Int16Array.from(c.x),
            y: Int16Array.from(c.y),
            z: Int16Array.from(c.z),
            t: Uint8Array.from(c.t),
            p: Int32Array.from(c.p),
            mid,
            tall: Math.max(...c.y) - Math.min(...c.y),
            round,
            spin: (a < 0.5 ? -1 : 1) * lerp(KIND_SPIN[0], KIND_SPIN[1], b),
            start: e * Math.PI * 2,
            depth: KIND_DEPTH[c.row] ?? 900,
          };
        });
      },
      () => {
        kindsAsked = false;
      }
    );
}

/** Whether `p` is inside the closed surface `m`: how many times a ray from it along +x crosses it, odd. */
function insideOf(m: Mesh, p: V3) {
  const { v, f } = m;
  let crossings = 0;
  for (let k = 0; k < f.length; k += 3) {
    const [a, b, c] = [f[k] * 3, f[k + 1] * 3, f[k + 2] * 3];
    const [ay, az, by, bz, cy, cz] = [v[a + 1], v[a + 2], v[b + 1], v[b + 2], v[c + 1], v[c + 2]];
    // its shadow on the y–z plane round p's, else no crossing
    if (ay > p[1] === by > p[1] && by > p[1] === cy > p[1]) continue;
    if (az > p[2] === bz > p[2] && bz > p[2] === cz > p[2]) continue;
    const d = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    if (Math.abs(d) < 1e-9) continue;
    const u = ((p[1] - ay) * (cz - az) - (p[2] - az) * (cy - ay)) / d;
    const t = ((by - ay) * (p[2] - az) - (bz - az) * (p[1] - ay)) / d;
    if (u < 0 || t < 0 || u + t > 1) continue;
    if (v[a] + u * (v[b] - v[a]) + t * (v[c] - v[a]) > p[0]) crossings++;
  }
  return crossings % 2 === 1;
}

/**
 * Where each of the kinds sits within the region, in the brain: places inside
 * it near the soma the view closes in on, as far apart from each other as can
 * be — the shallowest, nearest the brain's surface, for the kinds of the
 * shallowest layers — and, for each, which way the pia is from there. Found
 * once for each brain.
 */
const kindHomes = new WeakMap<Scene, { at: V3; up: V3 }[]>();
function homesOf(sc: Scene, cells: Kind[]) {
  const known = kindHomes.get(sc);
  if (known) return known;
  const rnd = mulberry32(2015);
  const inside: V3[] = [];
  for (let k = 0; k < 2500 && inside.length < 260; k++) {
    const q: V3 = [0, 1, 2].map((i) => sc.soma[i] + (rnd() * 2 - 1) * KINDS_NEAR) as V3;
    if (insideOf(sc.region, q)) inside.push(q);
  }
  if (inside.length === 0) inside.push(sc.soma);
  // as far apart as can be: from the one nearest the soma, each next the furthest from those already chosen
  const gap = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const chosen = [inside.reduce((best, q) => (gap(q, sc.soma) < gap(best, sc.soma) ? q : best))];
  const nearest = inside.map((q) => gap(q, chosen[0]));
  while (chosen.length < cells.length) {
    let far = 0;
    for (let k = 1; k < inside.length; k++) if (nearest[k] > nearest[far]) far = k;
    chosen.push(inside[far]);
    for (let k = 0; k < inside.length; k++)
      nearest[k] = Math.min(nearest[k], gap(inside[k], inside[far]));
  }
  // how deep each is: how far to the brain's surface, and which way that is
  const rv = sc.root.v;
  const placed = chosen.map((q) => {
    let [best, to] = [Infinity, 0];
    for (let k = 0; k < rv.length; k += 3) {
      const d = Math.hypot(rv[k] - q[0], rv[k + 1] - q[1], rv[k + 2] - q[2]);
      if (d < best) [best, to] = [d, k];
    }
    return {
      at: q,
      up: unit([rv[to] - q[0], rv[to + 1] - q[1], rv[to + 2] - q[2]], [0, -1, 0]),
      depth: best,
    };
  });
  // the shallowest places for the shallowest layers' kinds
  const byDepth = [...placed].sort((a, b) => a.depth - b.depth);
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c.depth - b.c.depth);
  const homes: { at: V3; up: V3 }[] = [];
  order.forEach(({ i }, k) => (homes[i] = byDepth[k]));
  kindHomes.set(sc, homes);
  return homes;
}

/**
 * Where the kinds go: over the page as far above the figure as below it, and
 * a little past its box either side, with room at the left for the rows'
 * names — each row's cells spread evenly across it, each one's name under it;
 * and how big all of them are drawn, px to the µm, the one scale for all: as
 * big as the middling cell, turned whichever way, fits its place.
 */
function kindsLayout(w: number, th: number, cells: Kind[]) {
  const below = Math.max(0, seen.y1 - 64 - th);
  const [top, foot] = seen.spill ? [-Math.max(0, below - 14), th + below] : [0, th];
  const spare = seen.spill ? Math.max(0, Math.min(150, -seen.x0 - 16, seen.x1 - w - 16)) : 0;
  const [left, right] = [104 - spare, w + spare];
  const groups = [0, 1].map((g) => cells.filter((c) => c.group === g));
  const slot = (g: number) => (right - left) / Math.max(1, groups[g].length);
  // each row as tall as its taller cells need, the room shared between the two in proportion
  const tallish = (list: Kind[]) =>
    list.map((c) => c.tall).sort((a, b) => a - b)[Math.floor(list.length * 0.8)] ?? 1;
  const needs = groups.map(tallish);
  const room = foot - top - KIND_FOOT - 2 * KIND_NAMED;
  const cellHs = needs.map((n) => (room * n) / (needs[0] + needs[1]));
  // and the one scale: as wide as the middling cell, turned, fits its place — its pale axon may reach a neighbour's
  const middling = cells.map((c) => c.round).sort((a, b) => a - b)[Math.floor(cells.length / 2)];
  const s = Math.min(
    (1.1 * Math.min(slot(0), slot(1))) / (2 * middling),
    (0.95 * room) / (needs[0] + needs[1])
  );
  const rowTop = (g: number) => top + (g ? cellHs[0] + KIND_NAMED : 0);
  return {
    top,
    foot,
    left,
    right,
    s,
    slot,
    cellH: (g: number) => cellHs[g],
    rowTop,
    at: (c: Kind) => ({
      x: left + (c.index + 0.5) * slot(c.group),
      y: rowTop(c.group) + cellHs[c.group] / 2,
    }),
  };
}

/** A name over as few lines as fit it in `room`, three at most, the lines as even as its words allow. */
function wrapName(ctx: CanvasRenderingContext2D, name: string, room: number): string[] {
  const words = name.split(' ');
  const width = (line: string) => ctx.measureText(line).width;
  let best = [name];
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    let pick: string[] = [];
    let widest = Infinity;
    // every way of breaking the words into n lines, the one whose widest line is narrowest
    const split = (from: number, lines: string[]) => {
      if (lines.length === n - 1) {
        const all = [...lines, words.slice(from).join(' ')];
        const most = Math.max(...all.map(width));
        if (most < widest) [pick, widest] = [all, most];
        return;
      }
      for (let k = from + 1; k <= words.length - (n - 1 - lines.length); k++)
        split(k, [...lines, words.slice(from, k).join(' ')]);
    };
    split(0, []);
    best = pick;
    if (widest <= room) break;
  }
  return best;
}

/**
 * The region's kinds of neuron, one cell of each, turning `now` ms in — and as
 * far again as dragged, `turn`: `inside` of them within the brain, as the view
 * closes in on `from`, its place on screen and the brain's scale, each to that
 * scale and at its layer's depth; and, `out` of the way, come out of it to
 * their places side by side, the page over the brain behind them — a row of
 * interneurons and a row of pyramidal cells, each named, each one's name under
 * it; a scale; and whose cells they are.
 */
function drawKinds(
  ctx: CanvasRenderingContext2D,
  inside: number,
  out: number,
  look: Look,
  w: number,
  th: number,
  now: number,
  turn: number,
  within: { x: number; y: number; angle: number }[] | null,
  s0: number
) {
  const shown = Math.max(inside, out);
  if (shown < 0.01) return;
  const white = !!look.white;
  const ink = white ? INK : WHITE;
  ctx.save();
  // the page, over the brain behind them, as they come out of it
  if (out > 0.01) {
    ctx.globalAlpha = out;
    ctx.fillStyle = rgba(white ? WHITE : look.bg[0], 1);
    ctx.fillRect(seen.x0, seen.y0, seen.x1 - seen.x0, seen.y1 - seen.y0);
  }
  const cells = kindCells;
  if (!cells) {
    ctx.restore();
    return;
  }
  const L = kindsLayout(w, th, cells);
  ctx.globalAlpha = shown;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const c of cells) {
    // within the brain, to its scale, where its layer is; and out from there to its place, growing as it comes
    const to = L.at(c);
    const home = within?.[cells.indexOf(c)];
    const [x0, y0, tilt0, from] = home ? [home.x, home.y, home.angle, s0] : [to.x, to.y, 0, L.s];
    const [x, y] = [lerp(x0, to.x, out), lerp(y0, to.y, out)];
    const s = from * (L.s / from) ** out;
    // turned upright as it comes, the short way round; and about its soma at first, its middle once in its place
    const tilt = tilt0 - Math.atan2(Math.sin(tilt0), Math.cos(tilt0)) * out;
    const [tc, ts] = [Math.cos(tilt), Math.sin(tilt)];
    const [mx, my, mz] = [c.mid[0] * out, c.mid[1] * out, c.mid[2] * out];
    // drawn finer the smaller it is
    const fine = clamp(s / L.s, 0.45, 1);
    // turned its own way about the line up through it: its axon first, paler and fine, its dendrites over it
    const a = c.start + c.spin * (now / 1000) + turn;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    const lx = (j: number) => ((c.x[j] - mx) * cos + (c.z[j] - mz) * sin) * s;
    const ly = (j: number) => -(c.y[j] - my) * s;
    const sx = (j: number) => x + lx(j) * tc - ly(j) * ts;
    const sy = (j: number) => y + lx(j) * ts + ly(j) * tc;
    for (const axon of [true, false]) {
      ctx.strokeStyle = axon
        ? rgba(mix(c.colour, white ? WHITE : look.bg[0], 0.45), 0.8)
        : rgba(c.colour, 0.95);
      ctx.lineWidth = (axon ? 0.55 : 0.9) * fine;
      ctx.beginPath();
      for (let j = 1; j < c.x.length; j++) {
        if ((c.t[j] === 2) !== axon) continue;
        const q = c.p[j];
        ctx.moveTo(sx(q), sy(q));
        ctx.lineTo(sx(j), sy(j));
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba(mix(c.colour, [0, 0, 0], 0.25), 1);
    ctx.beginPath();
    ctx.arc(sx(0), sy(0), 2.2 * fine, 0, Math.PI * 2);
    ctx.fill();
  }
  // and, once in their places, their names, the rows', a scale and whose they are
  const named = smooth((out - 0.6) / 0.4);
  if (named < 0.01) {
    ctx.restore();
    return;
  }
  ctx.globalAlpha = named;
  const { s } = L;
  // under each, its name in its colour
  for (const c of cells) {
    const { x } = L.at(c);
    const small = L.slot(c.group) < 80 ? 9.5 : 10.5;
    ctx.font = `italic ${small}px ${SERIF}`;
    const lines = wrapName(ctx, KIND_NAMES[c.type] ?? c.type, L.slot(c.group) - 6);
    const y = L.rowTop(c.group) + L.cellH(c.group) + 10;
    const name = mix(c.colour, [0, 0, 0], 0.2);
    lines.forEach((line, k) =>
      tag(ctx, line, x, y + k * (small + 1.5), name, look.bg[1], 1, small, 'center')
    );
  }
  // each row named at the left, and what its kind of neuron does to those it reaches
  KIND_GROUPS.forEach(([name, does], g) => {
    const y = L.rowTop(g) + L.cellH(g) / 2;
    tag(ctx, name, L.left - 14, y - 8, ink, null, 0.85, 13.5, 'right');
    tag(ctx, does, L.left - 14, y + 9, ink, null, 0.55, 11.5, 'right');
  });
  // a scale, and whose cells they are
  ctx.strokeStyle = rgba(ink, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L.right - 200 * s - 52, L.foot - 9);
  ctx.lineTo(L.right - 52, L.foot - 9);
  ctx.stroke();
  tag(ctx, '200 µm', L.right - 46, L.foot - 9, ink, null, 0.75, 11);
  tag(
    ctx,
    `${cells.length} kinds of neuron in the rat's somatosensory cortex, one real cell of each · Markram et al., 2015, Blue Brain Project`,
    L.left,
    L.foot - 9,
    ink,
    look.bg[1],
    0.6,
    10.5
  );
  ctx.restore();
}

/**
 * Two neurons that change as the mouse learns: where new branches sprout from
 * the first's axon to make synapses on the second's dendrites — the nearest
 * places on the two, spread apart; the reconstructions come from different
 * mice, so none of them touch, and every one is a new branch — and which tips
 * of their dendrites draw back and grow out again. Framed by both somata and
 * the places they meet.
 */
interface Plastic {
  pre: Scene;
  post: Scene;
  sites: { from: number; to: number }[];
  /** How much of the first's axon to draw: as far along it as the furthest place a branch sprouts from, and a little on. */
  axonTo: number;
  /**
   * For each node of either axon, how far it is from the part that makes and
   * loses the connections — the first's branches out to where they sprout, and
   * a little on — µm: 0 on it. The rest is drawn back as the view closes in.
   */
  preOff: Float32Array;
  postOff: Float32Array;
  /** The view square on to the plane they meet in, from above: its angle round, and down. */
  yaw: number;
  pitch: number;
  tips: { who: Scene; nodes: number[]; start: number; end: number; phase: number }[];
  centre: V3;
  ext: Ext;
}
const plastics = new Map<Scene, Plastic>();

function plasticOf(pre: Scene, post: Scene): Plastic {
  const known = plastics.get(pre);
  if (known && known.post === post) return known;
  const node = (sc: Scene, i: number): V3 => [sc.wx[i], sc.wy[i], sc.wz[i]];
  const axonal = (sc: Scene, i: number) => sc.n.type[i] === 2;
  // the tips that grow and draw back, five apiece: terminal branches at least 30 µm long, spread apart
  const tips: Plastic['tips'] = [];
  const inTips = new Set<number>();
  for (const sc of [post, pre]) {
    const { n } = sc;
    const kids = new Int32Array(n.x.length);
    for (let i = 1; i < n.x.length; i++) kids[n.parent[i]]++;
    const found: Plastic['tips'] = [];
    const leaves = [];
    for (let i = 1; i < n.x.length; i++) if (!kids[i] && !axonal(sc, i)) leaves.push(i);
    leaves.sort((a, b) => n.dist[b] - n.dist[a]);
    for (const leaf of leaves) {
      if (found.length >= 5) break;
      const nodes: number[] = [];
      let i = leaf;
      while (i > 0 && kids[n.parent[i]] === 1) {
        nodes.push(i);
        i = n.parent[i];
      }
      nodes.push(i);
      const start = n.dist[n.parent[i]];
      if (n.dist[leaf] - start < 30) continue;
      if (found.some((tp) => Math.hypot(...sub(node(sc, tp.nodes[0]), node(sc, leaf))) < 120))
        continue;
      found.push({
        who: sc,
        nodes,
        start,
        end: n.dist[leaf],
        phase: found.length * 0.37 * TIP_EVERY,
      });
      if (sc === post) for (const k of nodes) inTips.add(k);
    }
    tips.push(...found);
  }
  // where they meet: the nearest pairs of the first's axon and the second's dendrites, none in a growing tip, spread apart
  const pairs: { from: number; to: number; d: number }[] = [];
  for (let i = 1; i < pre.n.x.length; i++) {
    if (!axonal(pre, i) || pre.n.dist[i] < 40) continue;
    const a = node(pre, i);
    for (let j = 1; j < post.n.x.length; j++) {
      if (axonal(post, j) || inTips.has(j) || post.n.dist[j] < 25) continue;
      const d = Math.hypot(a[0] - post.wx[j], a[1] - post.wy[j], a[2] - post.wz[j]);
      if (d < 260) pairs.push({ from: i, to: j, d });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const sites: Plastic['sites'] = [];
  for (const p of pairs) {
    if (sites.length >= 7) break;
    const apart = sites.every(
      (q) =>
        Math.hypot(...sub(node(post, q.to), node(post, p.to))) > 70 &&
        Math.hypot(...sub(node(pre, q.from), node(pre, p.from))) > 70
    );
    if (apart) sites.push({ from: p.from, to: p.to });
  }
  const pts = [pre.soma, post.soma, ...sites.flatMap((q) => [node(pre, q.from), node(post, q.to)])];
  const centre = centreOf(pts.flat());
  const furthest = Math.max(0, ...sites.map((q) => pre.n.dist[q.from]));
  const axonTo = Math.min(1, (furthest + 250) / Math.max(1, pre.n.axonPath));

  // the part of the first's axon that does the connecting: the way out to each place a branch sprouts, and 120 µm on
  const keep = new Uint8Array(pre.n.x.length);
  for (const q of sites) for (let i = q.from; i > 0 && !keep[i]; i = pre.n.parent[i]) keep[i] = 1;
  const reachOn = new Float32Array(pre.n.x.length).fill(-1);
  for (const q of sites) reachOn[q.from] = pre.n.dist[q.from] + 120;
  for (let i = 1; i < pre.n.x.length; i++) {
    const p = pre.n.parent[i];
    if (reachOn[p] >= 0 && axonal(pre, i) && pre.n.dist[i] <= reachOn[p]) {
      keep[i] = 1;
      reachOn[i] = Math.max(reachOn[i], reachOn[p]);
    }
  }
  // and how far every other axon node is from it, along the axon — the second's being, all of it, from its soma
  const offOf = (sc: Scene, kept: Uint8Array | null) => {
    const off = new Float32Array(sc.n.x.length);
    for (let i = 1; i < sc.n.x.length; i++) {
      const p = sc.n.parent[i];
      off[i] = kept?.[i] ? 0 : (axonal(sc, p) ? off[p] : 0) + sc.n.dist[i] - sc.n.dist[p];
    }
    return off;
  };

  // the plane they meet in: their somata and the places they connect, its normal the way they vary least — and the
  // view square on to it, from above
  const n = planeNormal(pts);
  const up = n[1] < 0 ? scale(n, -1) : n;
  const yaw = Math.atan2(up[0], up[2]);
  const pitch = Math.asin(clamp(up[1], 0, 0.995));
  const [ct, st, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  // seen so, each across and down from their middle; and the middle of the smallest circle round them all, for the
  // view to turn about — stepping a shrinking way towards whichever is furthest
  const flat = pts.map((q): [number, number] => {
    const [a, d, m] = sub(q, centre);
    return [a * ct - m * st, d * cp - (a * st + m * ct) * sp];
  });
  let [cx, cy] = [0, 0];
  for (let k = 1; k <= 2000; k++) {
    const far = flat.reduce((f, q) =>
      Math.hypot(q[0] - cx, q[1] - cy) > Math.hypot(f[0] - cx, f[1] - cy) ? q : f
    );
    cx += (far[0] - cx) / (k + 1);
    cy += (far[1] - cy) / (k + 1);
  }
  const middle = add(centre, add(scale([ct, 0, -st], cx), scale([-st * sp, cp, -ct * sp], cy)));
  let [hx, hy, hr] = [1, 1, 1];
  for (const [x, y] of flat) {
    hx = Math.max(hx, Math.abs(x - cx));
    hy = Math.max(hy, Math.abs(y - cy));
    hr = Math.max(hr, Math.hypot(x - cx, y - cy));
  }
  const made: Plastic = {
    pre,
    post,
    sites,
    axonTo,
    preOff: offOf(pre, keep),
    postOff: offOf(post, null),
    yaw,
    pitch,
    tips,
    centre: middle,
    ext: { hx, hy, hr },
  };
  plastics.set(pre, made);
  return made;
}

/** The normal of the plane points lie closest to: the way they vary least — across the two ways they vary most. */
function planeNormal(pts: V3[]): V3 {
  const c = scale(
    pts.reduce((a, b) => add(a, b), [0, 0, 0] as V3),
    1 / pts.length
  );
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of pts) {
    const d = sub(p, c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i * 3 + j] += d[i] * d[j];
  }
  const times = (m: number[], v: V3): V3 =>
    [0, 1, 2].map((i) => m[i * 3] * v[0] + m[i * 3 + 1] * v[1] + m[i * 3 + 2] * v[2]) as V3;
  const most = (m: number[], seed: V3) => {
    let v = seed;
    for (let k = 0; k < 60; k++) v = unit(times(m, v), seed);
    return v;
  };
  const a = most(cov, [0.6, 0.3, 0.5]);
  const la = dot(times(cov, a), a);
  const b = most(
    cov.map((x, k) => x - la * a[Math.floor(k / 3)] * a[k % 3]),
    [0.2, 0.9, 0.3]
  );
  return unit(cross(a, b), [0, 1, 0]);
}

/**
 * How much of each segment of one of the two to draw, as the view closes in
 * on them (`pair`) and they change (`plastic`): of its axon, only the part that
 * makes and loses the connections — the rest drawn back towards it — and its
 * growing tips, drawn back as far as they are now.
 */
function cutOf(
  pl: Plastic,
  sc: Scene,
  time: number,
  pair: number,
  plastic: number
): ((i: number) => number) | null {
  const tips = trimOf(pl, sc, time, plastic);
  if (pair < 0.01 && !tips) return null;
  const off = sc === pl.pre ? pl.preOff : pl.postOff;
  const { type, parent } = sc.n;
  // the rest of the axon, drawn back towards the part kept, as far as the view has closed in
  const left = (1 - pair) * 3000;
  return (i) => {
    if (type[i] === 2 && off[i] > 0) {
      const from = off[parent[i]];
      return from >= left ? 0 : clamp01((left - from) / Math.max(1e-6, off[i] - from));
    }
    return tips ? tips(i) : 1;
  };
}

/** How much of each segment of `sc` to draw, `time` ms into its changing — its growing tips drawn back as far as they are now. */
function trimOf(
  pl: Plastic,
  sc: Scene,
  time: number,
  amount: number
): ((i: number) => number) | null {
  const mine = pl.tips.filter((tp) => tp.who === sc);
  if (!mine.length || amount < 0.01) return null;
  const end = new Map<number, number>();
  for (const tp of mine) {
    const u = ((time + tp.phase) % TIP_EVERY) / TIP_EVERY;
    const back = amount * 0.7 * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
    for (const i of tp.nodes) end.set(i, tp.end - back * (tp.end - tp.start));
  }
  const { dist, parent } = sc.n;
  return (i) => {
    const e = end.get(i);
    if (e === undefined) return 1;
    return clamp01((e - dist[parent[i]]) / Math.max(1e-6, dist[i] - dist[parent[i]]));
  };
}

/**
 * The connections between the two as they change, each in its turn: a new
 * branch growing out from the first's axon to one of the second's dendrites —
 * no thicker than the axon it grows from, as it is drawn at the view's scale
 * `s`; a synapse made where it lands — a bouton, lit as it forms; kept a while;
 * then lost, the bouton fading, and the branch drawn back in.
 */
function drawPlastic(
  ctx: CanvasRenderingContext2D,
  pl: Plastic,
  look: Look,
  time: number,
  amount: number,
  white: boolean,
  s: number
) {
  if (amount < 0.01) return;
  const { pre, post } = pl;
  ctx.save();
  ctx.lineCap = 'round';
  pl.sites.forEach((site, k) => {
    const u = ((time + ((k * 0.618) % 1) * SITE_EVERY) % SITE_EVERY) / SITE_EVERY;
    const grow = u < 0.2 ? smooth(u / 0.2) : u < 0.84 ? 1 : 1 - smooth((u - 0.84) / 0.16);
    const bouton =
      u < 0.2
        ? 0
        : u < 0.3
          ? smooth((u - 0.2) / 0.1)
          : u < 0.72
            ? 1
            : u < 0.84
              ? 1 - smooth((u - 0.72) / 0.12)
              : 0;
    if (grow < 0.01) return;
    const a = { x: pre.sx[site.from], y: pre.sy[site.from] };
    const b = { x: post.sx[site.to], y: post.sy[site.to] };
    // a gentle bow, not a ruled line
    const c = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.16, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.16 };
    const path: Pt[] = Array.from({ length: 21 }, (_, j) => {
      const f = (j / 20) * grow;
      const g = 1 - f;
      return {
        x: g * g * a.x + 2 * g * f * c.x + f * f * b.x,
        y: g * g * a.y + 2 * g * f * c.y + f * f * b.y,
      };
    });
    ctx.strokeStyle = rgba(look.eff, 0.95 * amount);
    // as wide as the axon where it sprouts, drawn as the neuron's own branches are
    ctx.lineWidth = Math.min(18, Math.max(0.55, pre.diam[site.from] * exaggerate(s) * s));
    ctx.beginPath();
    path.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    const end = path[path.length - 1];
    if (bouton > 0.01) {
      ctx.fillStyle = rgba(mix(look.eff, [0, 0, 0], 0.15), amount);
      ctx.beginPath();
      ctx.arc(end.x, end.y, 1.5 + 2.6 * bouton, 0, Math.PI * 2);
      ctx.fill();
    }
    // made: a ring of light going out from it; lost: a grey one
    for (const [from, to, colour] of [
      [0.2, 0.34, look.eff],
      [0.72, 0.84, [150, 156, 168] as RGB],
    ] as const) {
      if (u < from || u > to) continue;
      const e = (u - from) / (to - from);
      glowAt(ctx, end, 6 + 14 * e, colour, (1 - e) * amount, white);
      ctx.strokeStyle = rgba(colour, 0.8 * (1 - e) * amount);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 4 + 12 * e, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

/** The ten together — side by side, in the brain, or in the mouse — drawn as `pose` has them. */
function drawCrew(
  ctx: CanvasRenderingContext2D,
  crew: (Scene | null)[],
  family: Spec[],
  sel: number,
  stage: Stage,
  w: number,
  h: number,
  t: number,
  pose: Pose
) {
  const { look } = family[sel];
  const th = h;
  const main = crew[sel]!;
  const v = viewOf(pose);
  fluid(ctx, look, w, h, moving(t));
  ctx.save();
  clipToBox(ctx, w, th);
  // on white, the shadows beneath: the brain's while it floats on its own, then the mouse's
  brainShadow(ctx, main, v, pose.brain * (1 - pose.mouse), pose.go);
  mouseShadow(ctx, v, pose.mouse, pose.go);
  // the mouse — walking, maybe — the brain in it, and each one's region in its own colour, as glass
  const time = moving(t);
  const white = !!look.white;
  const g = gait(time, pose.walk, pose.go);
  const { body, legs, tail } = mouseParts();
  const fur = 0.95 * pose.mouse;
  const layers: GlassLayer[] = [
    { mesh: body, tint: FUR, strength: fur, move: g.body },
    ...legs.map((leg, i) => ({ mesh: leg.mesh, tint: FUR, strength: fur, move: g.legs[i] })),
    { mesh: tail.mesh, tint: FUR, strength: fur, move: g.tail },
    { mesh: main.root, tint: brainGlass(look), strength: 0.75 * pose.brain, move: g.body },
  ];
  crew.forEach((sc, i) => {
    if (sc)
      layers.push({
        mesh: sc.region,
        tint: family[i].look.cell,
        strength: 0.9 * pose.regions * pose.crew[i].alpha,
        move: g.body,
      });
  });
  drawLayers(ctx, v, layers, white, w, th);
  // come to the cheese, sniffing at it
  const sniff = stage === 'seek' ? phase(time, SEEK_AT + SEEK_FOR, 400) : 0;
  mouseFace(
    ctx,
    v,
    pose.mouse,
    g.lift,
    WHISK * sniff * Math.sin((2 * Math.PI * time) / WHISK_EVERY)
  );
  // walking to the cheese, it walks from the first; on the mouse slide, only once the command has gone out
  nerves(ctx, crew, family, v, time, stage === 'seek' ? -COMMAND_FOR : DRAW_BACK, pose, g, white);
  // the cheese, dropping in front of it
  drawCheese(ctx, v, pose.cheese, 6000 * (1 - phase(time, 300, 800)) ** 2);
  // the two that change as it learns, if they are here
  const [pre, post] = [PRE, POST].map((id) => crew[family.findIndex((k) => k.id === id)] ?? null);
  const pl = pre && post && (pose.pair > 0.01 || pose.plastic > 0.01) ? plasticOf(pre, post) : null;
  // the neurons, the furthest first — this one going in and out of its dendrogram, and its afferents going
  const layout = pose.tree > 0 ? dendrogram(main, pose.treeYaw, w, th) : null;
  const order = crew
    .map((sc, i) => ({ sc, i, z: sc ? depthOf(v, sc.core) : 0 }))
    .filter(({ sc, i }) => sc && pose.crew[i].alpha > 0.01)
    .sort((a, b) => b.z - a.z);
  for (const { sc, i } of order) {
    const n = sc!;
    const p = pose.crew[i];
    const mine = i === sel;
    const stub = Math.min(1, (0.6 * n.reach) / Math.max(1, n.n.axonPath));
    const changing = pl && (n === pl.pre || n === pl.post);
    drawNeuron(
      ctx,
      n,
      placeView(p, pose, v, n.core, g.lift),
      family[i].look,
      {
        dend: 1,
        // the one sending the new branches with its axon drawn whole; the one they reach, as the others
        axon:
          pl && n === pl.pre
            ? lerp(stub, Math.max(stub, pl.axonTo), pose.pair)
            : mine
              ? lerp(stub, 1, pose.axonAll)
              : stub,
        somaAlpha: 1,
        somaGlow: 0,
        cut: changing ? cutOf(pl, n, time, pose.pair, pose.plastic) : null,
        aff: mine && pose.aff > 0.01 ? n.aff.map(() => 1) : null,
        affAlpha: pose.aff,
        cell: p.alpha,
        tree: mine ? pose.tree : 0,
        layout: mine ? layout : null,
      },
      w,
      th
    );
  }
  // and, in the brain, signals passing among them; and the two that learn making and losing connections
  if (pose.talk > 0.01) talkAmong(ctx, crew, family, v, time, pose, g.lift, white);
  if (pl)
    drawPlastic(
      ctx,
      pl,
      family[family.findIndex((k) => k.id === PRE)].look,
      time,
      pose.plastic,
      white,
      pose.s
    );
  ctx.restore();

  // side by side, each one's name and where it is from under it; in the brain, a legend of their colours
  if (pose.labels > 0.01) {
    family.forEach((spec, i) => {
      const a = pose.labels * (crew[i] ? pose.crew[i].alpha : 0);
      const slot = slotOf(i, w, th);
      tag(
        ctx,
        capital(spec.cell),
        slot.x,
        slot.label,
        look.text,
        null,
        a,
        w < 700 ? 10 : 11.5,
        'center'
      );
      tag(
        ctx,
        spec.where,
        slot.x,
        slot.label + 13,
        look.text,
        null,
        0.65 * a,
        w < 700 ? 9 : 10,
        'center'
      );
    });
  }
  if (pose.legend > 0.01) {
    const rows = family.flatMap((spec, i) => (crew[i] ? [{ spec, i }] : []));
    ctx.font = `italic 11px ${SERIF}`;
    const widest = Math.max(
      ...rows.map(({ spec }) => ctx.measureText(`${capital(spec.cell)} · ${spec.where}`).width)
    );
    const x = w - 14 - widest - 22;
    const top = th / 2 - ((rows.length - 1) * 16) / 2;
    rows.forEach(({ spec, i }, k) => {
      const y = top + k * 16;
      const a = pose.legend * pose.crew[i].alpha;
      ctx.strokeStyle = rgba(spec.look.cell, a);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14, y);
      ctx.stroke();
      tag(ctx, `${capital(spec.cell)} · ${spec.where}`, x + 22, y, look.text, null, 0.85 * a, 11);
    });
  }
  legend(ctx, look, w, pose.aff);
  plate(
    ctx,
    look,
    w,
    th,
    pose.s,
    creditsOf(main, pose, crew, sel),
    (1 - pose.labels) * (1 - Math.max(0, ...pose.ills))
  );
}

/**
 * The slides before the signals, posed: the brain, turning; closer in, the
 * tissue around the neuron, its other cells coming in and each named; drawn
 * back to the neuron, whole, the others gone; its parts, each lit in turn —
 * the soma, if `closeOnSoma`, close in on it; and the neuron turning into a
 * dendrogram, laid out as seen from `treeYaw`.
 */
function cellsPose(
  sc: Scene,
  stage: Exclude<Stage, 'signals' | CrewStage>,
  t: number,
  yaw: number,
  treeYaw: number,
  w: number,
  h: number,
  closeOnSoma = false
): Pose {
  const f = frameOf(w, h);
  // three framings: the whole brain; the tissue around the neuron's soma; and the neuron, whole
  const s0 = f.fit(sc.brainExt, 26, 22);
  const sT = (h / 2 - 24) / TISSUE;
  const s1 = f.fit(sc.near, 30, 24);
  const none = sc.crowd.names.map(() => 0);
  const base = {
    tilt: 0,
    roll: 0,
    regions: 0,
    cell: 1,
    crowd: 0,
    redCells: 0,
    names: none,
    lit: UNLIT,
    title: 0,
    tree: 0,
    treeYaw,
    crew: [],
    mouse: 0,
    talk: 0,
    arcs: 0,
    walk: 0,
    cheese: 0,
    pair: 0,
    plastic: 0,
    go: 0,
    labels: 0,
    legend: 0,
    axonAll: 1,
    aff: 0,
    ills: [],
    zoom: 1,
    pan: 0,
    ions: 0,
    trio: 0,
    others: 0,
    kindsIn: 0,
    kinds: 0,
    skin: 0,
    near: 0,
    free: 0,
    tags: CLOSE.slice(1).map(() => 0),
    lined: 0,
    volt: 0,
    syn: 0,
    spread: 0,
  };
  if (stage === 'brain') {
    // the mouse's brain in the middle of a row of three, a fly's to its left and a human's to its right
    const slot = trioSlot(1, w, h);
    return {
      ...base,
      yaw,
      s: trioScale(sc.brainExt, slot),
      c: sc.brainCentre,
      ox: slot.x,
      oy: slot.y,
      brain: phase(t, 0, BRAIN_IN),
      cell: 0,
      trio: 1,
    };
  }
  if (stage === 'cells') {
    // in from the mouse's brain just where the first slide left it, in the middle of its row, to the tissue round the
    // soma: one zoom, all the way
    const slot = trioSlot(1, w, h);
    const from = trioScale(sc.brainExt, slot);
    const e = phase(t, ZOOM_AT, ZOOM_FOR);
    const s = from * (sT / from) ** e;
    const p0 = at(view(yaw, from, sc.brainCentre, slot.x, slot.y), sc.soma);
    return {
      ...base,
      yaw,
      s,
      c: sc.soma,
      ox: lerp(p0.x, f.cx, e),
      oy: lerp(p0.y, f.cy, e),
      brain: fadeOver(s / s0, 1.2, 2.4),
      // the rest of the ten in their places in the brain, as the view sets out — gone before it is close in
      others: phase(t, 0, 600) * (1 - phase(t, ZOOM_AT + 0.4 * ZOOM_FOR, 0.35 * ZOOM_FOR)),
      // there from the start of the zoom, coming into view as the view comes close enough to see them
      crowd: phase(t, ZOOM_AT, 500),
      // the red cells in the vessel only once the view has arrived
      redCells: phase(t, ZOOM_AT + ZOOM_FOR, 400),
      names: sc.crowd.names.map((_, k) => phase(t, NAMES_AT + k * NAME_EVERY, 400)),
    };
  }
  if (isClose(stage)) {
    // the dendrogram as the last slide left it, drawn in on one of its branches; and, close, a slide at a time, the
    // membrane there, the ions either side of it, and the channels through it
    const { width } = focusOf(sc, dendrogram(sc, treeYaw, w, h), s1);
    const e = stage === 'closer' ? phase(t, 0, ION_ZOOM) : 1;
    const layer = (from: Stage, at = 0, dur = LAYER_IN) =>
      stage === from
        ? phase(t, at, dur)
        : CLOSE.indexOf(stage) > (CLOSE as readonly Stage[]).indexOf(from)
          ? 1
          : 0;
    return {
      ...base,
      yaw,
      s: s1,
      c: sc.centre,
      ox: f.cx,
      oy: f.cy,
      brain: 0,
      // the neuron's name gone as the view arrives — it is any neuron's membrane now
      title: stage === 'closer' ? 1 - phase(t, ION_ZOOM - 600, 600) : 0,
      tree: 1,
      zoom: Math.max(1, (ION_BAND * h) / width) ** e,
      pan: e,
      // the branch, drawn in until it fills the band, the band itself: the rest of the dendrogram gone from round it
      ions: stage === 'closer' ? phase(t, ION_ZOOM - 600, 600) : 1,
      skin: layer('lipids'),
      // then ions of both kinds either side of it, wandering; at rest, the slight excess of charge lining it either
      // side, the ions further off still about it - gone, the slide after, for the voltage that lining makes under
      // the dendrite; a synapse onto it; and, on the last of them, the charge the synapse lets in spreading along it
      // the ions' slides closer in still, on a smaller piece of it: its top wall across the middle
      near: stage === 'charges' || stage === 'imbalance' ? 1 : 0,
      free: stage === 'charges' ? phase(t, CHARGES_AT, CHARGES_IN) : stage === 'imbalance' ? 1 : 0,
      lined: layer('imbalance', IMBALANCE_AT),
      volt: layer('voltage', VOLT_AT),
      syn: layer('synapse'),
      spread: stage === 'spread' ? 1 : 0,
      // each slide's own names on that slide alone
      tags: CLOSE.slice(1).map((own) => (stage === own ? phase(t, 0, LAYER_IN) : 0)),
    };
  }
  if (stage === 'dendrites') {
    // the dendrites close in, about their own middle, as big as the figure takes them, while they are lit
    return {
      ...base,
      yaw,
      s: f.fit(sc.dendExt, 26, 18),
      c: sc.core,
      ox: f.cx,
      oy: f.cy,
      brain: 0,
      lit: { ...UNLIT, dendrites: phase(t, 0, PART_IN) },
      title: 1,
    };
  }
  if (stage === 'soma' && closeOnSoma) {
    // the soma in the middle, its first stretches of dendrite and axon about it, turning about it
    const s = (h / 2 - 24) / (sc.somaR * SOMA_CLOSE);
    return {
      ...base,
      yaw,
      s,
      c: sc.soma,
      ox: f.cx,
      oy: f.cy,
      brain: 0,
      lit: { ...UNLIT, soma: phase(t, 0, PART_IN) },
      title: 1,
    };
  }
  const e = stage === 'neurons' ? phase(t, 0, REFRAME_FOR) : 1;
  const s = sT * (s1 / sT) ** e;
  const p0 = at(view(yaw, sT, sc.soma, f.cx, f.cy), sc.centre);
  const part = stage === 'soma' || stage === 'axon' ? stage : null;
  return {
    ...base,
    yaw,
    s,
    c: sc.centre,
    ox: lerp(p0.x, f.cx, e),
    oy: lerp(p0.y, f.cy, e),
    brain: fadeOver(s / s0, 1.2, 2.4),
    crowd: stage === 'neurons' ? 1 - phase(t, 0, 700) : 0,
    redCells: stage === 'neurons' ? 1 : 0,
    names: stage === 'neurons' ? sc.crowd.names.map(() => 1 - phase(t, 0, 300)) : none,
    lit: part ? { ...UNLIT, [part]: phase(t, 0, PART_IN) } : UNLIT,
    title: stage === 'neurons' ? phase(t, REFRAME_FOR - 600, 800) : 1,
    // eased node by node, nearest the soma first (see `treeOf`), so steady here
    tree: stage === 'dendrogram' ? clamp01(t / MORPH_FOR) : 0,
  };
}

/** The scale a plate's bar measures: the view's, or — in the dendrogram, along its branches — the dendrogram's. */
const barScale = (s: number, layout: Tree | null, tree: number) =>
  layout ? lerp(s, layout.k, smooth(tree)) : s;

/** The slides before the signals, drawn as `pose` has them; their parts pulse to `t`. */
function drawCells(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  spec: Spec,
  w: number,
  h: number,
  t: number,
  stage: Exclude<Stage, 'signals' | CrewStage>,
  pose: Pose,
  ten: (Scene | null)[] = [],
  family: Spec[] = [],
  sel = -1,
  hands: Turn[] = []
) {
  const { look } = spec;
  const th = h;
  const f = frameOf(w, th);
  const now = moving(t);
  const { s } = pose;
  const v = viewOf(pose);
  const layout = pose.tree > 0 ? dendrogram(sc, pose.treeYaw, w, th) : null;
  const z = s / f.fit(sc.brainExt, 26, 22);
  const s1 = f.fit(sc.near, 30, 24);
  const focus = (Math.min(w, th) / 2 / s) * 0.8;
  const pulse = Number.isFinite(t) ? 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / PULSE) : 1;
  // what belongs to the cell in three dimensions — its shadow, and what drifts about it — gone in the dendrogram
  const solid = 1 - pose.tree;
  const closer = !!layout && pose.zoom > 1.001;

  fluid(ctx, look, w, h, now);
  ctx.save();
  clipToBox(ctx, w, th);
  // on white, the shadows first, on the floors beneath: the brain's while it shows, the cell's once the view is close
  brainShadow(ctx, sc, v, pose.brain);
  cellShadow(
    ctx,
    sc,
    v,
    exaggerate(s),
    pose.cell * (1 - fadeOver(z, 4, 10)) * fadeOver(s1 / s, 1.3, 2.2) * solid
  );
  drawBrain(ctx, sc, v, look, 0.75 * pose.brain, pose.regions, w, th);
  drawTrio(ctx, pose, look, w, th, now, hands);
  // the rest of the ten, each where it lives in the brain, while the view is far enough out to take them in
  ten.forEach((n, i) => {
    const p = pose.crew[i];
    if (!n || i === sel || !p || p.alpha < 0.01) return;
    const stub = Math.min(1, (0.6 * n.reach) / Math.max(1, n.n.axonPath));
    const paint = { dend: 1, axon: stub, somaAlpha: 1, somaGlow: 0, aff: null, cell: p.alpha };
    drawNeuron(ctx, n, placeView(p, pose, v, n.core), family[i].look, paint, w, th);
  });
  const motes = (1 - fadeOver(z, 2.5, 7)) * solid;
  drawMotes(ctx, sc, v, look, motes, false, focus);
  // drawn in on a piece of dendrite, if the view has closed in on one
  if (closer) {
    ctx.save();
    zoomIn(ctx, sc, layout, pose, w, th);
  }
  if (pose.cell > 0.01 || pose.crowd > 0.01) {
    drawNeuron(
      ctx,
      sc,
      v,
      look,
      {
        dend: 1,
        axon: 1,
        somaAlpha: 1,
        somaGlow: 0,
        aff: null,
        cell: pose.cell,
        crowd: pose.crowd,
        redCells: pose.redCells,
        lit: pose.lit,
        pulse,
        time: now,
        tree: pose.tree,
        layout,
      },
      w,
      th
    );
  }
  if (closer) ctx.restore();
  // an axon that was cut with its slice goes on, dashed, a guess at where it went — and the spikes with it
  const cut = sc.out.cut < sc.out.pts.length;
  if (cut && pose.lit.axon > 0.01) {
    const rest = sc.out.pts.slice(sc.out.cut).map((q) => at(v, q));
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(look.eff, 0.75 * pose.lit.axon);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    rest.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    const d = sc.out.d.slice(sc.out.cut);
    const speed = spikeSpeed(s, w, th);
    for (let j = 1; j < rest.length; j++) {
      fronts(d[j - 1], d[j], now, speed, (k) =>
        spike(
          ctx,
          lerp(rest[j - 1].x, rest[j].x, k),
          lerp(rest[j - 1].y, rest[j].y, k),
          rest[j - 1].x,
          rest[j - 1].y,
          look,
          pose.lit.axon
        )
      );
    }
  }
  drawMotes(ctx, sc, v, look, motes, true, focus);
  ctx.restore();

  const middle = { x: f.cx, y: f.cy };
  sc.crowd.names.forEach((name, k) => {
    if (!(name.other ? NAME_OTHERS : NAME_NEURON)) return;
    callout(ctx, name.text, at(v, name.at), middle, look, pose.names[k] ?? 0, w, th);
  });
  callout(ctx, 'Dendrites', at(v, sc.marks.dendrite), middle, look, pose.lit.dendrites, w, th);
  callout(
    ctx,
    cut ? 'Axon (cut with the slice)' : 'Axon',
    at(v, sc.marks.axon),
    middle,
    look,
    pose.lit.axon,
    w,
    th
  );
  // at the soma's edge, so that closed in on it the arrow stops there, not over its middle
  const somaAt = at(v, sc.soma);
  const off = Math.hypot(somaAt.x - middle.x, somaAt.y - middle.y);
  const [ux, uy] =
    off < 30 ? [0.6, -0.8] : [(somaAt.x - middle.x) / off, (somaAt.y - middle.y) / off];
  const rim = Math.max(0, sc.somaR * exaggerate(s) * s - 4);
  callout(
    ctx,
    'Soma',
    { x: somaAt.x + ux * rim, y: somaAt.y + uy * rim },
    middle,
    look,
    pose.lit.soma,
    w,
    th
  );
  plate(
    ctx,
    look,
    w,
    th,
    barScale(s, layout, pose.tree) * pose.zoom,
    creditsOf(sc, pose),
    (1 - Math.max(0, ...pose.ills)) * (1 - pose.ions) * (1 - pose.trio)
  );
}

/** When the signals slide's neuron first fires, ms in: once its first round of inputs has all arrived. */
const firstFire = (sc: Scene) => FIRST_IN + STAGGER * (sc.aff.length - 1) + IN_FOR + DEND_FOR + 150;

/** The signals slide, posed: on the dendrogram, as the last slide left it, close in as it was. */
function signalsPose(sc: Scene, yaw: number, treeYaw: number, w: number, h: number): Pose {
  const f = frameOf(w, h);
  return {
    yaw,
    tilt: 0,
    roll: 0,
    s: f.fit(sc.near, 30, 24),
    c: sc.centre,
    ox: f.cx,
    oy: f.cy,
    tree: 1,
    treeYaw,
    brain: 0,
    regions: 0,
    cell: 1,
    crowd: 0,
    redCells: 0,
    names: sc.crowd.names.map(() => 0),
    lit: UNLIT,
    title: 1,
    crew: [],
    mouse: 0,
    talk: 0,
    arcs: 0,
    walk: 0,
    cheese: 0,
    pair: 0,
    plastic: 0,
    go: 0,
    labels: 0,
    legend: 0,
    axonAll: 1,
    aff: 1,
    ills: [],
    zoom: 1,
    pan: 0,
    ions: 0,
    trio: 0,
    others: 0,
    kindsIn: 0,
    kinds: 0,
    skin: 0,
    near: 0,
    free: 0,
    tags: CLOSE.slice(1).map(() => 0),
    lined: 0,
    volt: 0,
    syn: 0,
    spread: 0,
  };
}

function drawSignals(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  spec: Spec,
  w: number,
  h: number,
  t: number,
  pose: Pose
) {
  const { look } = spec;
  const th = h;
  const now = moving(t);
  const cut = sc.out.cut < sc.out.pts.length;
  const count = sc.aff.length;
  const inAt = (i: number, k: number) => FIRST_IN + STAGGER * i + k * CYCLE;
  const fireAt = (k: number) => firstFire(sc) + k * CYCLE;
  const { s } = pose;
  const v = viewOf(pose);
  const layout = pose.tree > 0 ? dendrogram(sc, pose.treeYaw, w, th) : null;
  const focus = (Math.min(w, th) / 2 / s) * 0.8;
  const fireFor = 1800;

  // the soma gathers each arrival, and flares when it fires
  const kNow = Math.max(0, Math.floor((now - FIRST_IN) / CYCLE));
  let glow = 0;
  for (const k of [kNow - 1, kNow]) {
    if (k < 0) continue;
    for (let i = 0; i < count; i++) {
      const arrived = now - (inAt(i, k) + IN_FOR + DEND_FOR);
      if (arrived >= 0) glow += 0.22 * Math.exp(-arrived / 700);
    }
    const fired = now - fireAt(k);
    if (fired >= 0) glow += 0.9 * Math.exp(-fired / 350);
  }
  const grown = sc.aff.map((_, i) => phase(t, i * 110, 800));

  // what belongs to the cell in three dimensions — its shadow, and what drifts about it — gone in the dendrogram
  const solid = 1 - pose.tree;
  const white = !!look.white;
  fluid(ctx, look, w, h, now);
  ctx.save();
  clipToBox(ctx, w, th);
  // come from a piece of dendrite, drawing out from it again
  if (layout && pose.zoom > 1.001) zoomIn(ctx, sc, layout, pose, w, th);
  cellShadow(ctx, sc, v, exaggerate(s), solid);
  drawMotes(ctx, sc, v, look, solid, false, focus);
  drawNeuron(
    ctx,
    sc,
    v,
    look,
    {
      dend: 1,
      axon: 1,
      somaAlpha: 1,
      somaGlow: Math.min(1.2, glow),
      aff: grown,
      tree: pose.tree,
      layout,
    },
    w,
    th
  );
  drawMotes(ctx, sc, v, look, solid, true, focus);

  // the signals: pulses of light along the afferents, down the dendrites, and out along every branch of the efferent
  // axon — as far as the figure shows it, a long one running off its foot
  const leads = sc.leads;
  const downs = sc.aff.map((a) => a.nodes.map((i) => ({ x: sc.sx[i], y: sc.sy[i] })));
  const route = wayOut(sc, v, layout, pose.tree);
  const outLen = sc.out.d[sc.out.d.length - 1];
  let gone = route.findIndex(
    (p) => outside(p.x, p.y, 16) || (!!layout && p.x >= layout.right - 0.5)
  );
  if (gone === 0) gone = 1;
  const travel = gone > 0 ? sc.out.d[gone] : outLen;
  const seen = upTo(route, sc.out.d, travel);
  for (const k of [kNow - 1, kNow]) {
    if (k < 0) continue;
    sc.aff.forEach((a, i) => {
      const u = (now - inAt(i, k)) / IN_FOR;
      if (u > 0 && u < 1) pulse(ctx, leads[i], a.d, u * a.d[a.d.length - 1], look.aff, 9, 1, white);
      const flash = (now - inAt(i, k) - IN_FOR) / 300;
      if (flash > 0 && flash < 1)
        glowAt(ctx, leads[i][leads[i].length - 1], 10 + 8 * flash, look.aff, 1 - flash, white);
      const down = (now - inAt(i, k) - IN_FOR) / DEND_FOR;
      if (down > 0 && down < 1) {
        // fading as it goes, as a signal does along a dendrite
        pulse(
          ctx,
          downs[i],
          a.routeD,
          down * a.routeD[a.routeD.length - 1],
          look.cell,
          8,
          1 - 0.5 * down,
          white
        );
      }
    });
    const u = (now - fireAt(k)) / fireFor;
    if (u > 0 && u < 1) {
      const reach = (k === 0 ? u * u * (3 - 2 * u) : u) * travel;
      // down every branch of the axon, splitting at each fork; and on along the guess at where it went, if it was cut
      spread(
        ctx,
        sc,
        reach,
        26 / (layout ? layout.k : s),
        look,
        white,
        layout ? layout.right : Infinity
      );
      if (cut && reach > sc.out.d[sc.out.cut])
        pulse(ctx, route, sc.out.d, reach, look.eff, 11, 1, white);
    }
    // where it ends, if the figure shows it: a burst
    const burst = (now - fireAt(k) - fireFor) / 900;
    if (gone < 0 && burst > 0 && burst < 1) {
      const end = route[route.length - 1];
      glowAt(ctx, end, 12 + 16 * burst, look.eff, 1 - burst, white);
      ctx.strokeStyle = rgba(look.eff, 0.7 * (1 - burst));
      ctx.lineWidth = 1.5;
      for (const r of [8, 16]) {
        ctx.beginPath();
        ctx.arc(end.x, end.y, r * (0.5 + burst), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  if (cut) {
    // the axon goes on past where the reconstruction stops: a dashed guess
    const first = clamp01((t - fireAt(0)) / fireFor);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(look.eff, 0.55);
    ctx.lineWidth = 1.2;
    const rest = upTo(route.slice(sc.out.cut), sc.out.d.slice(sc.out.cut), first * travel);
    ctx.beginPath();
    rest.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // a few arrows: one on each afferent, three along the way out as the first signal passes them
  const edge = look.bg[1];
  leads.forEach((lead, i) =>
    arrowAlong(ctx, lead, 0.5, look.aff, edge, phase(t, i * 110 + 800, 400))
  );
  const firstAt = clamp01((t - fireAt(0)) / fireFor);
  const cum = lengths(seen);
  for (const frac of [0.3, 0.55, 0.8]) {
    // where on the axon, in µm, that point on screen is
    let j = 0;
    while (j < seen.length - 1 && cum[j] < frac * cum[cum.length - 1]) j++;
    const passed = firstAt * firstAt * (3 - 2 * firstAt) * travel >= sc.out.d[j];
    if (passed) arrowAlong(ctx, seen, frac, look.eff, edge, 1);
  }
  ctx.restore();

  const end = seen[seen.length - 1];
  const away = Math.hypot(...sub(sc.out.pts[sc.out.pts.length - 1], sc.soma));
  const label = cut ? 'axon, cut with the slice' : `to other neurons, ${length(away)} away`;
  ctx.font = `italic 12px ${SERIF}`;
  const tw = ctx.measureText(label).width;
  tag(
    ctx,
    label,
    clamp(end.x + 12, 14, w - 14 - tw),
    clamp(end.y - 16, 70, th - 30),
    look.eff,
    look.bg[1],
    phase(t, fireAt(0) + fireFor, 600)
  );
  legend(ctx, look, w, phase(t, 300, 600));
  plate(
    ctx,
    look,
    w,
    th,
    barScale(s, layout, pose.tree),
    creditsOf(sc, pose),
    1 - Math.max(0, ...pose.ills)
  );
}

/* -------------------------------------------------------------- components */

function Wet3D({
  spec,
  stage,
  back = false,
  controls,
}: {
  spec: Spec;
  stage: Stage;
  back?: boolean;
  /** Under the neuron's name and credit, above the figure, once it is named: the arrows that switch to another. */
  controls?: ReactNode;
}) {
  const [scene, setScene] = useState<Scene | 'failed' | null>(
    () => scenes.get(keyOf(spec)) ?? null
  );
  // The stage being drawn: since when, from what angle, from how far in. The figure stays put while its
  // slides change, so a new stage takes over here — easing out of the pose last drawn.
  const run = useRef<{ stage: Stage; first: number; yaw: number; t0: number; held: number } | null>(
    null
  );
  const drawn = useRef<Pose | null>(null);
  const from = useRef<{ pose: Pose; at: number; for: number } | null>(null);
  // When each of the others was first drawn, so that one fetched late comes in, rather than just appearing.
  const came = useRef(new Map<Scene, number>());
  // The neuron's name, faded in and out frame by frame as the pose has it. A figure that starts finished —
  // as one does when the neuron is switched — starts named, on a slide that names it, so its arrows stay put.
  const name = useRef<HTMLDivElement | null>(null);
  const [namedAtFirst] = useState(() =>
    back && STAGES.indexOf(stage) >= STAGES.indexOf('neurons') && !isCrew(stage) ? 1 : 0
  );
  // The ten it is one of — in its own look, on white or not — for the slides that show them all, fetched
  // once its own slides are under way, one at a time as the page is idle, so as not to stutter them.
  const family = spec.look.white ? FLOATING : SPECS;
  const sel = family.findIndex((k) => k.id === spec.id);
  const [crew, setCrew] = useState<(Scene | null)[]>(() =>
    family.map((k) => scenes.get(keyOf(k)) ?? null)
  );
  // the ten, from the first slide on, so that the second can show them all as it closes in on this one
  const wantCrew = STAGES.indexOf(stage) >= STAGES.indexOf('brain');
  // Whether it draws all it holds, past its box over the whole page, behind the words; and, when it does,
  // the place kept for it in the page, which it is still framed by. Never outside a course.
  const embedded = useContext(Embedded);
  const spill = useSyncExternalStore(subscribe, savedSpill, () => false) && !embedded;
  const somaZoom = useSyncExternalStore(subscribe, savedSomaZoom, () => false);
  // whether the soma's slide was last drawn closed in on the soma: switched in the settings, it eases there
  const closedIn = useRef(somaZoom);
  const frame = useRef<HTMLDivElement | null>(null);
  const spillRoot = useSpillRoot(frame, spill);
  // Turned and tilted by hand, by dragging across it — and eased back straight with a double click. On the first
  // slide, the brain dragged across, each on its own: the mouse's is the figure's, the others' their own.
  const hand = useRef<{
    yaw: number;
    tilt: number;
    kin: Turn[];
    settle: boolean;
    drag: { id: number; x: number; y: number; yaw: number; tilt: number; turns: Turn } | null;
  }>({ yaw: 0, tilt: 0, kin: KIN.map(() => ({ yaw: 0, tilt: 0 })), settle: false, drag: null });

  // the first slide's other brains, as soon as there is a figure to show them in
  useEffect(() => loadKin(), []);
  // one region's own kinds of neuron, from a slide or two before they are wanted
  const wantKinds = STAGES.indexOf(stage) >= STAGES.indexOf('gallery');
  useEffect(() => {
    if (wantKinds) loadKinds();
  }, [wantKinds]);

  useEffect(() => {
    let live = true;
    sceneOf(spec).then(
      (sc) => {
        if (live) setScene(sc);
      },
      () => {
        if (live) setScene('failed');
      }
    );
    return () => {
      live = false;
    };
  }, [spec]);

  useEffect(() => {
    if (!wantCrew) return;
    let live = true;
    (async () => {
      for (let i = 0; i < family.length && live; i++) {
        if (!scenes.has(keyOf(family[i]))) await idle();
        const sc = await sceneOf(family[i]).catch(() => null);
        if (live && sc)
          setCrew((had) => (had[i] === sc ? had : had.map((k, j) => (j === i ? sc : k))));
      }
    })();
    return () => {
      live = false;
    };
  }, [wantCrew, family]);

  const canvasRef = useCanvasFrame((ctx, cw, ch, now) => {
    // its box: the canvas itself — or, spilling over the page, the place kept for it there, the canvas the window
    let [w, h] = [cw, ch];
    const box = spill ? frame.current?.getBoundingClientRect() : null;
    if (box) {
      ctx.translate(box.left, box.top);
      [w, h] = [Math.round(box.width), Math.round(box.height)];
      Object.assign(seen, {
        x0: -box.left,
        y0: -box.top,
        x1: cw - box.left,
        y1: ch - box.top,
        spill: true,
      });
    } else Object.assign(seen, { x0: 0, y0: 0, x1: w, y1: h, spill: false });
    if (!scene || scene === 'failed') {
      fluid(ctx, spec.look, w, h, now);
      if (scene === 'failed')
        tag(
          ctx,
          'Couldn’t load the reconstruction.',
          w / 2,
          h / 2,
          spec.look.text,
          null,
          0.8,
          13,
          'center'
        );
      return;
    }
    // A stage's clock starts once there is something to show — at its finished picture, on a slide come
    // back to; and, with reduced motion, there and still. It carries on from the angle last drawn; only
    // the very start, the brain, begins afresh.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const key = keyOf(spec);
    if (run.current?.stage !== stage) {
      const carried = run.current || back || stage !== 'brain' ? handoff.get(key) : undefined;
      // come back to, or come to from the slide that dives into it — learning — the mouse starts where it was, walking
      const done = back || (stage === 'mouse' && run.current?.stage === 'learn');
      run.current = {
        stage,
        first: now,
        yaw: carried ?? startingYaw(scene, stage),
        t0: done ? DONE[stage] : 0,
        held: 0,
      };
      if (drawn.current) from.current = { pose: drawn.current, at: now, for: 0 };
    }
    if (closedIn.current !== somaZoom) {
      closedIn.current = somaZoom;
      if (drawn.current && stage === 'soma')
        from.current = { pose: drawn.current, at: now, for: 0 };
    }
    const elapsed = still ? 0 : now - run.current.first;
    let t = still ? Infinity : run.current.t0 + elapsed - run.current.held;
    // the second slide's cells come into view at once, but the view waits to close in on them until the slide's
    // words have typed out — while its caret is there; and, close in on the membrane, so do the ions drawn to it
    const wait = WAIT_FOR_WORDS[stage];
    if (
      wait !== undefined &&
      t > wait &&
      (frame.current?.closest('main') ?? document).querySelector('.typing-caret')
    ) {
      run.current.held += t - wait;
      t = wait;
    }
    const yaw = yawOf(scene, stage, run.current.yaw, elapsed, t);
    // the dendrogram is laid out as the view the neuron turns to face sees it, so that it unfolds in place
    const treeYaw = facingFrom(scene, run.current.yaw);
    const ten = crew.map((k, i) => (i === sel ? scene : k));
    let pose = isCrew(stage)
      ? crewPose(scene, ten, family, sel, stage, t, elapsed, run.current.yaw, yaw, treeYaw, w, h)
      : withCrew(
          stage === 'signals'
            ? signalsPose(scene, yaw, treeYaw, w, h)
            : cellsPose(scene, stage, t, yaw, treeYaw, w, h, somaZoom),
          scene,
          sel,
          family.length
        );
    if (isCrew(stage) || stage === 'cells')
      pose.crew.forEach((p, i) => {
        const sc = ten[i];
        if (!sc || i === sel) return;
        if (!came.current.has(sc)) came.current.set(sc, now);
        p.alpha *= smooth((now - came.current.get(sc)!) / 600);
      });
    if (from.current) {
      // the longer the way, the longer it takes: drawing in from the whole mouse to one neuron takes its time
      from.current.for ||=
        BLEND *
        clamp(
          1 +
            0.25 * Math.abs(Math.log(pose.s / from.current.pose.s)) +
            0.25 * Math.abs(Math.log(pose.zoom / from.current.pose.zoom)),
          1,
          2.4
        );
      const k = still ? 1 : smooth((now - from.current.at) / from.current.for);
      if (k >= 1) from.current = null;
      // the diseases' names out of the way at once, however long the move
      else
        pose = mixPose(
          from.current.pose,
          pose,
          k,
          still ? 1 : smooth((now - from.current.at) / ILL_OUT)
        );
    }
    drawn.current = pose;
    handoff.set(key, pose.yaw);
    const named = name.current;
    const shown = String(pose.title < 0.01 ? 0 : Math.round(pose.title * 100) / 100);
    if (named && named.style.opacity !== shown) {
      named.style.opacity = shown;
      named.style.visibility = shown === '0' ? 'hidden' : 'visible';
    }
    // all ten, while any but this one shows, or this one is anywhere but where the camera holds it
    // — but on the second slide the rest of them with this one, its tissue round it
    const own = stage === 'brain' || stage === 'cells';
    const together =
      isCrew(stage) ||
      pose.regions > 0.01 ||
      pose.mouse > 0.01 ||
      pose.crew.some((p, i) => (i === sel ? p.stick < 0.995 : !own && p.alpha > 0.01));
    // as turned and tilted by hand — which, let go of with a double click, eases back to nothing
    const by = hand.current;
    if (by.settle && !by.drag) {
      const all = [by, ...by.kin];
      for (const o of all) [o.yaw, o.tilt] = [o.yaw * 0.86, o.tilt * 0.86];
      if (all.every((o) => Math.abs(o.yaw) < 0.002 && Math.abs(o.tilt) < 0.002)) {
        for (const o of all) [o.yaw, o.tilt] = [0, 0];
        by.settle = false;
      }
    }
    const turned = byHand(pose, by);
    if (together) drawCrew(ctx, ten, family, sel, stage, w, h, t, turned);
    else if (stage === 'signals') drawSignals(ctx, scene, spec, w, h, t, turned);
    else drawCells(ctx, scene, spec, w, h, t, stage, turned, ten, family, sel, by.kin);
    drawIlls(ctx, scene, turned.ills, spec.look, w, h, moving(t));
    // (the ions wander on through any wait for the words: their own clock, not the slide's)
    const wandering = moving(t + run.current.held);
    drawIons(ctx, turned.ions, spec.look, w, h, wandering, turned, moving(t));
    // the region's kinds of neuron, within it as the view closes in on it, and then out of it to their places
    const home = ten[family.findIndex((k) => k.id === AREA_ID)] ?? scene;
    const homes =
      kindCells && (turned.kindsIn > 0.01 || turned.kinds > 0.01) ? homesOf(home, kindCells) : null;
    const seenFrom = viewOf(turned);
    const within =
      homes?.map(({ at: q, up }) => {
        const [a, b] = [at(seenFrom, q), at(seenFrom, add(q, scale(up, 100)))];
        return { x: a.x, y: a.y, angle: Math.atan2(b.x - a.x, -(b.y - a.y)) };
      }) ?? null;
    drawKinds(
      ctx,
      turned.kindsIn,
      turned.kinds,
      spec.look,
      w,
      h,
      moving(t),
      by.yaw,
      within,
      turned.s * KINDS_SHRINK
    );
    // spilling over the page, nothing it draws behind the words above it
    if (box) {
      fadeAbove(ctx, box, frame.current);
      fadeBelow(ctx, box, frame.current);
    }
  });

  const onGrab = (e: React.PointerEvent<HTMLDivElement>) => {
    // not when it is one of its own buttons or links that is pressed, the arrows by the name; but it
    // may sit inside one itself, as the Learn page's small pictures sit in a course's card
    const pressed = (e.target as HTMLElement).closest('button, a');
    if (e.button !== 0 || (pressed && e.currentTarget.contains(pressed))) return;
    try {
      // so the drag goes on outside it, as far as the pointer goes
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer that is no longer down: the drag still works within the figure
    }
    const by = hand.current;
    // on the first slide, whichever brain it was grabbed by
    const r = e.currentTarget.getBoundingClientRect();
    const one = stage === 'brain' ? trioAt(e.clientX - r.left, r.width) : -1;
    const turns = one >= 0 && KIN[one].mesh ? by.kin[one] : by;
    by.drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      yaw: turns.yaw,
      tilt: turns.tilt,
      turns,
    };
    by.settle = false;
  };
  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = hand.current.drag;
    if (!d || d.id !== e.pointerId) return;
    d.turns.yaw = d.yaw + (e.clientX - d.x) * TURN_PER_PX;
    d.turns.tilt = clamp(d.tilt + (e.clientY - d.y) * TILT_PER_PX, ...TILT_RANGE);
  };
  const onDrop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hand.current.drag?.id === e.pointerId) hand.current.drag = null;
  };
  const onStraighten = () => {
    const by = hand.current;
    // the short way back, for each
    for (const o of [by, ...by.kin]) o.yaw = Math.atan2(Math.sin(o.yaw), Math.cos(o.yaw));
    by.settle = true;
  };

  const label: Record<Stage, string> = {
    brain:
      "Three glassy brains turning side by side, each drawn to fit, with a bar for its true size: a fruit fly's, about 0.8 mm across, with some 140,000 neurons; a mouse's, about 1 cm long, with some 70 million; and a human's, about 18 cm long, with some 86 billion.",
    cells: `Close in, the tissue around one neuron, and the other kinds of cell in it${NAME_OTHERS ? ', each named' : ''}: an astrocyte, a microglial cell, an oligodendrocyte precursor, an oligodendrocyte and a blood vessel.`,
    neurons: `The others fade, and the view draws back to the ${spec.cell}: one real neuron, in three dimensions.`,
    whole: `The ${spec.cell} again, whole, turning in three dimensions.`,
    dendrites: `Specks of light spark along the ${spec.cell}'s dendrites, where it receives inputs from other neurons.`,
    axon: `Pulses run out along the ${spec.cell}'s axon: signals on their way to other neurons.`,
    soma: `The ${spec.cell}'s soma pulses: the cell body, where its inputs come together.`,
    dendrogram: `The ${spec.cell} stops turning, and its branches straighten out into a flat dendrogram that reads left to right: the dendrites to the left of the soma, the axon running off to the right.`,
    signals: `On the dendrogram, signals travel in along afferent axons to the ${spec.cell}'s dendrites, along them to the soma, and out along every branch of its efferent axon, each in its own colour.`,
    gallery: `Ten real neurons side by side, each turning in three dimensions, each named: ${family.map((k) => k.cell).join(', ')}.`,
    atlas:
      'The ten neurons in their places in a glassy mouse brain, each with the region it was found in, in its own colour.',
    talk: 'The ten neurons in their places in the glassy brain, its regions in their colours, signals passing from one to another along the ways they connect.',
    mouse:
      'The view draws back from the brain to the glass mouse round it, the ten neurons small within it; a command runs from the brain down the spinal cord to the legs, and the mouse walks, what its paws and whiskers feel running back up to the brain.',
    seek: 'The mouse walks to the cheese, signals passing in and out between its brain and body as it goes, and sniffs at it, whiskers sweeping.',
    closer: `The dendrogram is drawn in on one of the ${spec.cell}'s dendrites until one short piece of it fills the view.`,
    lipids:
      'That piece of dendrite close in, its edges drawn in as the cell membrane: a double layer of lipids. A lens over a few of them shows them large, each a round head and two fatty tails, the two layers back to back with their heads out and their tails in.',
    membrane:
      'The same piece of dendrite: across the middle, the inside of the neuron, and above and below it the extracellular space outside the cell — the two kept apart by the cell membrane.',
    charges:
      'Then ions of both kinds, positive in red and negative in blue, wandering inside the dendrite and in the space outside it, either side of the membrane.',
    imbalance:
      'At rest, a slight excess of charge lines the membrane: positive ions along its outside, in red, and negative ions along its inside, in blue, while the ions further off stay mixed.',
    voltage:
      'The charge lining the membrane stays, and under the dendrite a plot of the voltage it makes across the membrane at each place along it: the same everywhere at rest, about −70 mV.',
    synapse:
      "Then, from above, another neuron's axon ending on the dendrite at a synapse. Every few seconds a spike runs down it to the synapse, and positive ions flow in through a channel there; the charge across the membrane there drops, and the voltage there rises, the plot below bulging upward at that place and then settling back.",
    spread:
      'Again a spike reaches the synapse and positive ions flow in, but now the charge they bring spreads along the inside of the dendrite either way, and the bulge in the voltage below spreads out with it, growing lower as it widens, before it dies away.',
    disease: `The mouse fades from round its brain, and the brain, its ten neurons still signalling to each other, sits in the middle of the page among the names of neurological and psychiatric disorders: ${ILLS.join(', ')}.`,
    area: `Closer in, one region of the brain, the somatosensory cortex — and in its place the 26 kinds of neuron Markram and colleagues found there in 2015, side by side, one real cell of each drawn small, each in its own colour and turning its own way, named under it: a row of interneurons — ${Object.keys(
      KIND_NAMES
    )
      .filter((k) => !PYRAMIDAL_KINDS.includes(k))
      .map((k) => KIND_NAMES[k])
      .join(
        ', '
      )} — and a row of pyramidal cells — ${PYRAMIDAL_KINDS.map((k) => KIND_NAMES[k]).join(', ')}.`,
    learn:
      "A piece of cheese comes down in front of the mouse; then, deep in its brain, two neurons of the hippocampus, seen square on to the plane they meet in and turning in it, change as it learns: new branches grow from one's axon to make connections with the other, older connections are lost, and their dendrites' tips draw back and grow out again.",
  };
  const credit = scene && scene !== 'failed' ? labOf(scene.n) : null;
  // the row for the neuron's name: always in a course, and outside one only on a slide that names it
  const nameRoom =
    !embedded || (STAGES.indexOf(stage) >= STAGES.indexOf('neurons') && !isCrew(stage));
  const ink = (alpha: number) => rgba(spec.look.text, alpha);
  // Outside a course, the first slide's row of brains is drawn only as tall as it needs: each brain
  // fits its third of the width (less 40px), about 0.62 as tall as it is wide turned round, over 110px
  // of labels and margins (see trioSlot). In a course it keeps its height, so the slide does not move.
  const boxClass =
    embedded && stage === 'brain'
      ? 'h-[min(var(--learn-figure-h,340px),calc(110px+(33.333cqw-40px)*0.9))] w-full rounded-xl'
      : spec.look.white
        ? FLOATING_CLASS
        : FIGURE_CLASS;
  return (
    <div
      className={`${embedded ? '@container ' : ''}relative flex w-full flex-1 cursor-grab touch-none flex-col select-none active:cursor-grabbing`}
      title="Drag to turn it · double-click to set it straight"
      onPointerDown={onGrab}
      onPointerMove={onDrag}
      onPointerUp={onDrop}
      onPointerCancel={onDrop}
      onDoubleClick={onStraighten}
      // a drag across it turns it, rather than swiping on to another slide
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* the figure in the middle of the room under the words, as much above it as below — and above it, at its left,
          the neuron's name, where it is from and whose reconstruction it is, and arrows to switch it: out of the
          figure, so that all of its width is the figure's */}
      {/* Outside a course, as on the Learn page's card, the room for the name is kept only on a slide
          that names the neuron: elsewhere, as round the first slide's brains, it would only be a blank
          band above the figure. In a course it stays, so the slides do not move. */}
      {/* (and not drawn at all there, its arrows with it: on the Learn page the figure may sit inside a
          course's card, itself a button, which cannot hold buttons) */}
      {nameRoom && (
        <div className="relative min-h-[52px] flex-1">
          <div
            ref={name}
            className="pointer-events-none absolute bottom-1 left-[14px] flex flex-col italic"
            style={{
              fontFamily: SERIF,
              color: ink(1),
              opacity: namedAtFirst,
              visibility: namedAtFirst ? 'visible' : 'hidden',
            }}
          >
            <span className="text-[15px] leading-5">{capital(spec.cell)}</span>
            <span className="text-[11px] leading-[15px]" style={{ color: ink(0.7) }}>
              {spec.where} · mouse
              {credit && <span style={{ color: ink(0.6) }}> · {credit}</span>}
            </span>
            {controls && (
              <span className="pointer-events-auto mt-1.5 flex items-center gap-1 self-start not-italic">
                {controls}
              </span>
            )}
          </div>
        </div>
      )}
      {spill ? (
        <>
          <div ref={frame} role="img" aria-label={label[stage]} className={boxClass} />
          {spillRoot &&
            createPortal(
              // biome-ignore lint/a11y/noAriaHiddenOnFocusable: drawn behind the words, never focused
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
              />,
              // into the course's root, which stacks its own layers: behind its words, and in front of its page
              spillRoot
            )}
        </>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={label[stage]} className={boxClass} />
      )}
      <div className="flex-1" />
    </div>
  );
}

/** On white, no frame: the figure is the page, and the cell floats on it. */
const FLOATING_CLASS = 'h-[340px] w-full rounded-xl';

/** Ten, as the switcher wants them: a name, and one figure that runs across the slides, told which it is on. */
const variants = (specs: Spec[], kind?: string) =>
  specs.map((spec) => {
    function Figure({
      stage,
      back,
      controls,
    }: {
      stage: Stage;
      back?: boolean;
      controls?: ReactNode;
    }) {
      return <Wet3D spec={spec} stage={stage} back={back} controls={controls} />;
    }
    const name = `${capital(spec.cell)}, ${spec.where}`;
    return { name: kind ? `${kind} · ${name}` : name, Figure };
  });

/** The same ten, floating on white. */
export const FLOAT_3D = variants(FLOATING);
