import { MAX_BUMP_AMPLITUDE } from '../engine/looks';
import { BASE_RADIUS_FRACTION, SOMA_MIN_RADIUS, STEM_MIN_DISTANCE } from '../engine/soma';

/** What the help card of a control says. engine/README.md has the long form. */
export interface HelpText {
  text: string;
  /** What a change does, each under a short key: "Higher" and "Lower", "On" and "Off", or a menu's options. */
  effects?: [string, string][];
  /** A change shows at once, in the view only: the card says so. Not for a section's card. */
  applies?: 'view';
}

export const HELP = {
  dark: {
    text:
      "The light or the dark variant of the look's background, each with its own set of neurite colours. Some " +
      'looks keep their own background either way.',
    applies: 'view',
  },
  colors: {
    text:
      'The colour of each neurite type, on the mesh and the skeleton. Click a swatch to pick another; colouring by ' +
      'distance puts the swatches aside. The eye leaves the type out: after a short pause the mesh is built again ' +
      'without it, and the soma always stays.',
  },
  'reset-colors': {
    text:
      'Puts the neurite colours of both backgrounds back to their defaults, shows the hidden types again and colours ' +
      'by section.',
  },
  'color-by': {
    text: 'What the neurite colours show.',
    effects: [
      ['Section', 'Each neurite type in its own colour.'],
      [
        'Distance',
        'The path distance from the soma along the neurites: green at the soma, through yellow, to red at the ' +
          'farthest point. The key gives the scale in microns.',
      ],
    ],
    applies: 'view',
  },
  look: {
    text:
      'The shading style, each with a line that describes it. Some looks turn the bumps and the ambient occlusion ' +
      'on, and they stay on for the next look until turned off. Some draw in colours of their own, and the neurite ' +
      'colours then have no effect.',
    applies: 'view',
  },
  'look-key': {
    text: "What the look's own colours mean. The neurite colours have no effect in this look.",
  },
  'type-tint': {
    text:
      'A faint tint of the neurite colours for the looks that draw the whole cell in one colour (EM segmentation). The ' +
      'other looks have no use for it.',
    applies: 'view',
  },
  ao: {
    text: 'Fibres shade each other where they come close, and dense regions darken from afar, which helps to read depth.',
    effects: [['Cost', 'An extra pass per frame at half the resolution.']],
    applies: 'view',
  },
  bumps: {
    text:
      'An organic roughness of the surface, drawn by the shader. It scales with the local radius, so the soma bumps ' +
      'most and a thin axon barely. The mesh itself stays smooth.',
    applies: 'view',
  },
  'bump-amp': {
    text: `Peak height of the bumps, as a fraction of the local radius: ${MAX_BUMP_AMPLITUDE} at most.`,
    effects: [
      ['Higher', 'Lumpier, like a membrane.'],
      ['Lower', 'Subtler; 0 is smooth.'],
    ],
    applies: 'view',
  },
  'bump-scale': {
    text: 'Width of the bumps: the size of one cell of the noise.',
    effects: [
      ['Higher', 'Broad swellings.'],
      ['Lower', 'A fine grain.'],
    ],
    applies: 'view',
  },
  'bump-smooth': {
    text: 'How much finer detail rides on the bumps.',
    effects: [
      ['Higher', 'Only the broadest waves; 1 leaves a single octave.'],
      ['Lower', 'A second and a third octave of finer detail come in.'],
    ],
    applies: 'view',
  },
  'min-width': {
    text:
      'Draws every fibre at least this many pixels wide, however far away the camera is. A whole cell fits on the ' +
      'screen at microns per pixel, where a thin axon covers a fraction of a pixel and all but vanishes. The shader ' +
      'widens it on screen only: the mesh keeps the true radii. Close up nothing is that thin, and nothing changes.',
    effects: [
      [
        'Higher',
        'Bolder lines from afar; dense arbors merge into patches, and calibres cannot be compared there.',
      ],
      [
        'Lower',
        'Finer lines; below 1 they break into dashes. 0 draws each fibre at its true width.',
      ],
    ],
    applies: 'view',
  },
  'show-mesh': {
    text: 'Shows the surface. Turn it off, with a skeleton chosen below, to see the skeleton alone.',
    applies: 'view',
  },
  wireframe: {
    text:
      "Draws the triangles' edges instead of a shaded surface, which shows the tubes' rings, the voxel patches and " +
      'how far the simplification went.',
    applies: 'view',
  },
  skeleton: {
    text:
      'Draws the skeleton as lines in the neurite colours. They are depth-tested, so within a solid mesh they show ' +
      'only where they leave the surface. The traced skeleton shows on its own until the mesh is built.',
    effects: [
      ['Off', 'The mesh alone.'],
      ['Traced', "The file's skeleton, as traced."],
      [
        'Processed',
        'What the mesh is built from, after smoothing, resampling, untangling and simplification.',
      ],
    ],
    applies: 'view',
  },
  spin: {
    text: 'Turns the view slowly around the soma.',
    applies: 'view',
  },
  perspective: {
    text: 'How the cell is projected onto the screen.',
    effects: [
      [
        'On',
        'Perspective: nearer parts look larger, and depth reads naturally. There is no scale bar, as no one scale holds.',
      ],
      [
        'Off',
        'Orthographic: a micron is as long on screen at any depth, so the scale bar holds for the whole cell.',
      ],
    ],
    applies: 'view',
  },
  'scale-bar': {
    text:
      'A ruler down the left of the view, in microns. Only in the orthographic view: in perspective nearer parts ' +
      'look larger, and no one scale holds.',
    applies: 'view',
  },
  export: {
    text:
      'Downloads the mesh on show, in microns, with the soma centre at the origin as in the view. The hidden types ' +
      'are left out, and the colours are the neurite colours of the current background; the look and its bumps are ' +
      'not part of the file.',
    effects: [
      [
        'GLB',
        'glTF binary with normals and colours. Opens in Blender, three.js and most 3D tools.',
      ],
      [
        'Draco GLB',
        'The same, 15 to 25 times smaller. Needs a reader with a Draco decoder: three.js with DRACOLoader, Blender, ' +
          'Babylon.js.',
      ],
      ['STL', 'Triangles only, without colours: for 3D printing and CAD.'],
    ],
  },
  stats: {
    text:
      'What the file holds, and what the last build made and what it took. “closed surface ✓” means that every edge ' +
      'has exactly two triangles, so the mesh is watertight; anything else is in bold.',
  },
  morphology: {
    text:
      'An SWC skeleton: points with a position, a radius and a type, each linked to its parent. Coordinates are ' +
      'shifted so that the soma centre, or without a soma the middle of the cell, is the origin.',
    effects: [
      [
        'Soma',
        `Sized from its stems, not from the traced soma: its radius is ${BASE_RADIUS_FRACTION} × the distance to the ` +
          `nearest arbor that starts ${STEM_MIN_DISTANCE} µm or more out. With none, the fitted sphere stands, ` +
          `raised to ${SOMA_MIN_RADIUS} µm where it is smaller, unless an arbor forks nearer the centre.`,
      ],
    ],
  },
} satisfies Record<string, HelpText>;

export type HelpKey = keyof typeof HELP;
