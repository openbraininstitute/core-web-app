import { FULL_ABOVE_PX, SLOW_FRAME_MS, STAND_IN_BELOW_PX } from '../engine/mesh-choice';

import type { HelpText } from '@/features/viewer-3d/help/help-button';

/** The help cards of the EM mesh viewer's controls. */
export const HELP = {
  look: {
    text:
      'The shading style, each with a line that describes it. EM segmentation turns the ambient occlusion on; ' +
      'choosing a look without it puts it back as it was.',
    applies: 'view',
  },
  ao: {
    text: 'Folds and neighbouring processes shade each other where they come close, which helps to read depth.',
    effects: [
      ['Cost', 'A pass per frame at half the resolution, over the depth the mesh is drawn with.'],
    ],
    applies: 'view',
  },
  wireframe: {
    text:
      "Draws the triangles' edges of the simplified copy of the mesh shown while the full one loads. The full mesh " +
      'has too many triangles to draw as wires.',
    applies: 'view',
  },
  spin: {
    text: 'Turns the view slowly around the centre of the cell.',
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
  dark: {
    text: "The light or the dark variant of the look's background. Some looks keep their own background either way.",
    applies: 'view',
  },
  load: {
    text:
      'Where the time went. The GLB is downloaded and decoded in workers; a simplified stand-in is drawn first, then ' +
      'the full mesh is split into chunks and uploaded a few chunks a frame. The stand-in is cached for the next ' +
      'visit, as is the GLB.',
  },
  memory: {
    text:
      "The workers' WASM memory at its peak, which is given back when each worker ends, the budget the mesh was " +
      'checked against before decoding, and what the meshes take on the GPU, with the frame buffers.',
  },
  'view-status': {
    text:
      `The stand-in is drawn while its error is under about a device pixel: the full mesh comes in past ` +
      `${FULL_ABOVE_PX} px, and goes under ${STAND_IN_BELOW_PX} px. Where a full frame takes the GPU more than ` +
      `${SLOW_FRAME_MS} ms, the stand-in is drawn while the view moves.`,
  },
  'ao-depth': {
    text: 'Where the ambient occlusion reads the depth from, to compare the two.',
    effects: [
      [
        'Main pass',
        'The depth the mesh is drawn with; the normals are rebuilt from it. One draw a frame.',
      ],
      ['Own pass', 'A second draw of the mesh a frame, into a depth and normal target of its own.'],
    ],
    applies: 'view',
  },
  'force-mesh': {
    text: 'Draws one of the two meshes whatever the zoom, to compare them.',
    effects: [
      ['Auto', 'As chosen by the error on screen and the frame cost.'],
      ['Stand-in', 'The simplified copy.'],
      ['Full', 'Every triangle, once it is uploaded.'],
    ],
    applies: 'view',
  },
  'chunk-boxes': {
    text: 'The bounds of the chunks the mesh on show is split into: the stand-in in blue, the full mesh in orange.',
    applies: 'view',
  },
  download: {
    text: 'The GLB as stored, in nanometres and not recentred.',
  },
} satisfies Record<string, HelpText>;

export type HelpKey = keyof typeof HELP;
