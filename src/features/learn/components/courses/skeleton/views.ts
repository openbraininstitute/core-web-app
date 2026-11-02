/**
 * The skeleton figure's steps, as data: what the 3D view shows on each, what it says to a screen
 * reader, and how the step is laid out. No three.js and no React here, so that a test can read it.
 */

import type { CELLS } from './cells';
import type { Layers, ViewState } from './engine/view';

export const SKELETON_STEPS = [
  // one cell, three ways
  'intro',
  'mesh',
  'skeleton',
  'spines',
  'spine',
  'compare',
  // the skeletonization workflow
  'workflow',
  'params',
  'launch',
  'outputs',
  'registered',
  // inside the files
  'swc',
  'sections',
  'h5',
  'table',
  'frame',
  'parts',
  'length',
  // in Python
  'fetch',
  'load',
  'table-code',
  'meshes',
  'skeleton-code',
  'convert',
  'validate',
  'downstream',
  'gotchas',
] as const;
export type SkeletonStep = (typeof SKELETON_STEPS)[number];

/**
 * The steps that show a cell of Python as it ran on the course's example cell, each with its key in
 * cells.ts.
 */
export const CODE_CELLS = {
  load: 'load',
  'table-code': 'table',
  meshes: 'meshes',
  'skeleton-code': 'skeleton',
  convert: 'convert',
  validate: 'validate',
} as const satisfies Partial<Record<SkeletonStep, keyof typeof CELLS>>;
export type CodeStep = keyof typeof CODE_CELLS;

export const isCodeStep = (step: SkeletonStep): step is CodeStep => step in CODE_CELLS;

/**
 * How a step is laid out: the 3D view alone; a panel beside a smaller 3D view on a wide screen and
 * over it on a narrow one; or the panel alone, the 3D view hidden but kept, so that it goes on
 * where it was.
 */
export type Layout = 'full' | 'side' | 'panel';

/** The opening view's loop: the membrane, then the skeleton and spines inside it as glass, then them alone. */
const INTRO_CYCLE: readonly Layers[] = [
  { mesh: 'solid', skeleton: 'off', spines: 'off', spineSkeleton: false },
  { mesh: 'glass', skeleton: 'type', spines: 'each', spineSkeleton: false },
  { mesh: 'off', skeleton: 'type', spines: 'each', spineSkeleton: false },
];

/** Everything, the membrane as glass, turning: beside the outputs, and behind the panels that hide the view. */
const ALL: ViewState = { shot: 'whole', spin: true, ...INTRO_CYCLE[1] };

/** The skeleton alone, by type, turning. */
const SKELETON: ViewState = {
  shot: 'whole',
  spin: true,
  mesh: 'off',
  skeleton: 'type',
  spines: 'off',
  spineSkeleton: false,
};

/** A stretch of dendrite and its spines, each its own colour. */
const SPINES: ViewState = {
  shot: 'dendrite',
  spin: false,
  mesh: 'off',
  skeleton: 'plain',
  spines: 'each',
  spineSkeleton: false,
};

/** What each step's 3D view shows. */
export const STATES: Record<SkeletonStep, ViewState> = {
  // with reduced motion, the loop's middle view, still
  intro: { shot: 'whole', spin: true, ...INTRO_CYCLE[1], cycle: INTRO_CYCLE },
  mesh: { shot: 'whole', spin: true, ...INTRO_CYCLE[0] },
  skeleton: SKELETON,
  spines: SPINES,
  spine: {
    shot: 'spine',
    spin: false,
    mesh: 'glass',
    skeleton: 'plain',
    spines: 'one',
    spineSkeleton: true,
  },
  compare: {
    shot: 'dendrite',
    spin: false,
    mesh: 'wipe',
    skeleton: 'type',
    spines: 'each',
    spineSkeleton: false,
  },
  workflow: ALL,
  params: ALL,
  launch: ALL,
  outputs: ALL,
  registered: ALL,
  swc: {
    shot: 'soma',
    spin: true,
    mesh: 'off',
    skeleton: 'type',
    spines: 'off',
    spineSkeleton: false,
  },
  sections: {
    shot: 'whole',
    spin: true,
    mesh: 'off',
    skeleton: 'sections',
    spines: 'sections',
    spineSkeleton: false,
  },
  h5: ALL,
  table: {
    shot: 'pick',
    spin: false,
    mesh: 'glass',
    skeleton: 'plain',
    spines: 'picked',
    spineSkeleton: false,
    markers: 'picked',
  },
  frame: {
    shot: 'frame',
    spin: false,
    mesh: 'off',
    skeleton: 'plain',
    spines: 'others',
    spineSkeleton: false,
    frame: true,
  },
  parts: {
    shot: 'dendrite',
    spin: false,
    mesh: 'off',
    skeleton: 'plain',
    spines: 'height',
    spineSkeleton: false,
  },
  length: {
    shot: 'dendrite',
    spin: false,
    mesh: 'off',
    skeleton: 'plain',
    spines: 'length',
    spineSkeleton: false,
  },
  fetch: ALL,
  load: ALL,
  'table-code': {
    shot: 'dendrite',
    spin: false,
    mesh: 'off',
    skeleton: 'sections',
    spines: 'sections',
    spineSkeleton: false,
  },
  meshes: {
    shot: 'spine',
    spin: false,
    mesh: 'off',
    skeleton: 'plain',
    spines: 'one',
    spineSkeleton: true,
  },
  'skeleton-code': SKELETON,
  convert: {
    shot: 'whole',
    spin: true,
    mesh: 'off',
    skeleton: 'plain',
    spines: 'off',
    spineSkeleton: false,
  },
  validate: ALL,
  downstream: SPINES,
  gotchas: ALL,
};

/** How each step is laid out. */
export const LAYOUTS: Record<SkeletonStep, Layout> = {
  intro: 'full',
  mesh: 'full',
  skeleton: 'full',
  spines: 'full',
  spine: 'full',
  compare: 'full',
  workflow: 'panel',
  params: 'panel',
  launch: 'panel',
  outputs: 'side',
  registered: 'panel',
  swc: 'side',
  sections: 'full',
  h5: 'side',
  table: 'side',
  frame: 'full',
  parts: 'side',
  length: 'full',
  fetch: 'panel',
  load: 'side',
  'table-code': 'side',
  meshes: 'side',
  'skeleton-code': 'side',
  convert: 'side',
  validate: 'side',
  downstream: 'side',
  gotchas: 'panel',
};

/** What each step's 3D view shows, for a screen reader. */
export const LABELS: Record<SkeletonStep, string> = {
  intro:
    'A real neuron in 3D, turning: its membrane from electron microscopy, then its skeleton and spines inside it, then the skeleton and spines alone.',
  mesh: "The neuron's membrane as a mesh of triangles, turning.",
  skeleton:
    "The neuron's skeleton as tubes, the soma and the basal dendrites in their colours, turning.",
  spines: 'A stretch of dendrite with its spines, each in its own colour.',
  spine:
    'One spine close up, coloured by distance from its dendrite, with its own small skeleton, its root, its centre on the dendrite and an arrow along its direction.',
  compare:
    'A stretch of dendrite: the membrane left of a line that can be dragged across, the skeleton and spines right of it.',
  workflow: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  params: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  launch: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  outputs: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  registered: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  swc: "The soma and the first stretches of the neuron's skeleton, coloured by type, turning.",
  sections:
    'The skeleton turning, each section in its own colour and labelled with its id in the spine table, each spine in the colour of its section.',
  h5: 'The whole cell turning; the part of the file named in the list is lit and the rest dimmed.',
  table:
    "The spine picked in the table close up, the other spines dimmed, with the row's root, centre and direction drawn on it.",
  frame:
    'One spine, upright in its own frame with its x, y and z axes, turning and moving onto its place on the dendrite, again and again.',
  parts: 'A stretch of dendrite, its spines coloured by distance from the dendrite.',
  length: 'A stretch of dendrite, its spines coloured by their length.',
  fetch: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  load: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  'table-code':
    'A stretch of dendrite, each section in its own colour and labelled with its id in the spine table, each spine in the colour of its section.',
  meshes:
    'One spine close up, coloured by distance from its dendrite, with its own small skeleton, its root, its centre on the dendrite and an arrow along its direction.',
  'skeleton-code':
    "The neuron's skeleton as tubes, the soma and the basal dendrites in their colours, turning.",
  convert: "The neuron's skeleton as tubes in one colour, turning.",
  validate: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
  downstream: 'A stretch of dendrite with its spines, each in its own colour.',
  gotchas: 'The whole cell, its membrane as glass over its skeleton and spines, turning.',
};
