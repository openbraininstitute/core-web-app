import { MAX_REFINE } from '../engine/hybrid';
import { MAX_BUMP_AMPLITUDE } from '../engine/looks';
import { MIN_RADIUS_VOXELS } from '../engine/mesher';
import { HEAVY_AXON_FACTOR } from '../engine/prepare';
import { BASE_RADIUS_FRACTION, SOMA_MIN_RADIUS, STEM_MIN_DISTANCE } from '../engine/soma';
import { MAX_SHIFT } from '../engine/untangle';

/** What the help card of a control says. engine/README.md has the long form. */
export interface HelpText {
  text: string;
  /** What a change does, each under a short key: "Higher" and "Lower", "On" and "Off", or a menu's options. */
  effects?: [string, string][];
  /** A change shows at once in the view only, or rebuilds the mesh: the card says so. Not for a section's card. */
  applies?: 'view' | 'build';
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
      'on; choosing a look without them puts them back as they were. Some draw in colours of their own, and the neurite ' +
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
      'widens it on screen only: the mesh keeps the true radii. Close up nothing is that thin, and nothing changes. ' +
      'The skeleton shown while the mesh is built has the same floor.',
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
      'only where they leave the surface. Until the mesh is built, the traced skeleton stands in for it, each fibre ' +
      'as wide as the mesh draws it.',
    effects: [
      ['Off', 'The mesh alone.'],
      [
        'Traced',
        "The file's skeleton as written: a neurite on the soma joins it at the soma point the file links it to.",
      ],
      [
        'Processed',
        'What the mesh is built from, after smoothing, resampling, untangling and simplification. A neurite on ' +
          'the soma joins it as in the mesh, most of them by a neck from its centre.',
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
  controls: {
    text:
      "How the mesh is built, and the bumps' shape, for this viewer until the page is reloaded. A change to the " +
      'skeleton or the mesh builds it again after a short pause; the old mesh stays until the new one is in. Reset ' +
      "puts them back to the defaults, and the bumps to the look's own where it has them.",
  },
  smoothing: {
    text:
      'Gaussian smoothing along each section, of the path and the radii alike, over σ microns of arc length. It ' +
      'irons out the jitter of a manual tracing.',
    effects: [
      ['Higher', 'Smoother paths and a steadier calibre; small real bends and swellings go too.'],
      ['Lower', 'Closer to the tracing, noise included. 0 keeps the traced points.'],
    ],
    applies: 'build',
  },
  'axon-radius': {
    text:
      "How the axon's radii are smoothed. Traced axon calibres are mostly noise, so by default they are smoothed " +
      'much harder than the path.',
    effects: [
      ['Traced', "The radii get the same σ as the dendrites'."],
      ['Heavy', `${HEAVY_AXON_FACTOR} × σ for the radii; the path keeps σ.`],
      ['Constant', "Every axon point gets the axon's median radius."],
    ],
    applies: 'build',
  },
  'axon-step': {
    text:
      'Resamples every axon section at this step of arc length, after the smoothing. The ends stay, and each point ' +
      'takes the mean radius over its step. Every point is a ring of the tube, and an axon can be millimetres long.',
    effects: [
      [
        'Longer',
        'Fewer rings and triangles, faster builds; tight bends are cut short by straight chords.',
      ],
      [
        'Shorter',
        'Follows the bends more closely, with more triangles. A step finer than the tracing only adds points.',
      ],
    ],
    applies: 'build',
  },
  simplify: {
    text:
      'Drops skeleton points that change the path and the radius by less than this (Ramer–Douglas–Peucker). The ' +
      'resampled axon has few points to drop, so this acts mostly on the dendrites.',
    effects: [
      [
        'Higher',
        'Fewer points and a faster build; gentle bends and changes of calibre flatten out.',
      ],
      [
        'Lower',
        "More points. Half a voxel drops about half of a tracing's points without changing the mesh.",
      ],
    ],
    applies: 'build',
  },
  untangle: {
    text:
      'Moves fibres apart where the tracing has them touch without their belonging together, such as an axon traced ' +
      `through a dendrite. The thinner one goes around, by about a micron as a rule and ${MAX_SHIFT} µm at most. ` +
      'The statistics say what moved.',
    effects: [
      ['On', 'Separate fibres stay separate surfaces.'],
      [
        'Off',
        'Touching fibres are welded, and every weld is a handle through the surface that the cell does not have.',
      ],
    ],
    applies: 'build',
  },
  tubes: {
    text:
      'Sweeps a tube along a neurite wherever it runs alone, at its traced calibre, and uses voxels only for the ' +
      'patches around branch points, the soma and contacts.',
    effects: [
      ['On', 'Several times faster, far fewer triangles, and thin fibres keep their true radius.'],
      [
        'Off',
        'The whole surface comes from one voxel grid: slower, and fibres thinner than the min radius are thickened.',
      ],
    ],
    applies: 'build',
  },
  'tube-aspect': {
    text:
      "How long a tube's triangles may be: the most that two rings may be apart, as a multiple of the edge length " +
      'around them. The surface is the same at any value. Only with the tubes on.',
    effects: [
      ['Higher', 'Fewer and longer triangles on straight runs.'],
      ['Lower', 'Triangles closer to equilateral, and more of them.'],
    ],
    applies: 'build',
  },
  voxel: {
    text:
      'Edge of the voxel grid that meshes the blended parts: branch points, the soma and contacts, or all of the ' +
      'cell with the tubes off. With the tubes on it is the coarsest grid; around thin fibres the voxels get finer, ' +
      `down to 1/${MAX_REFINE} of it.`,
    effects: [
      [
        'Smaller',
        'Finer detail at the junctions, at the cost of triangles, time and memory: with the tubes off, about 1 / voxel².',
      ],
      [
        'Larger',
        'Faster and lighter. With the tubes off, fibres thinner than the min radius are thickened.',
      ],
    ],
    applies: 'build',
  },
  'min-radius': {
    text:
      'The smallest radius a voxel grid is given, in its voxels. A fibre thinner than about a voxel falls between ' +
      `the grid's samples and breaks into pieces, so the slider starts at ${MIN_RADIUS_VOXELS}.`,
    effects: [
      [
        'Higher',
        'More margin for thin fibres: finer, costlier patches with the tubes on; thicker fibres with them off.',
      ],
      ['Lower', 'Cheaper patches, or a truer calibre with the tubes off.'],
    ],
    applies: 'build',
  },
  blend: {
    text: 'Width of the smooth fillet where neurites meet, as a multiple of the local radius.',
    effects: [
      ['Higher', 'Rounder, webbed branch points, and rounder welds where fibres touch.'],
      ['Lower', 'Crisper branch points, close to tubes simply joining.'],
    ],
    applies: 'build',
  },
  'soma-blend': {
    text: 'The same for the soma and its necks: how smoothly the dendrites and the axon grow out of it.',
    effects: [
      ['Higher', 'A soft, flared base to every stem.'],
      ['Lower', 'Stems meet the soma more abruptly.'],
    ],
    applies: 'build',
  },
  'mesh-simplify': {
    text:
      'How far a simplified triangle may stray from the true surface, as a multiple of the voxel; it also sets how ' +
      'many vertices go around a tube. Never more than half the local radius, so thin axons are not cut.',
    effects: [
      ['Higher', 'Far fewer triangles and smaller exports; curved surfaces get faceted.'],
      ['Lower', 'A truer surface with more triangles. 0 keeps the raw voxel mesh.'],
    ],
    applies: 'build',
  },
  gpu: {
    text:
      'Computes the voxel field, extracts the surface and checks the simplification in WebGPU compute shaders ' +
      'instead of on the CPU workers. The mesh is the same either way. Off where the browser has no WebGPU, or ' +
      'once the device has failed a build.',
    effects: [
      ['On', 'Faster builds: about a third less time on the sample cell.'],
      ['Off', 'CPU workers only.'],
    ],
    applies: 'build',
  },
} satisfies Record<string, HelpText>;

export type HelpKey = keyof typeof HELP;
