import { VIEW_HELP } from '@/features/viewer-3d/help/view-help';

import { COLD, FULL_ABOVE_PX, STAND_IN_BELOW_PX, WAKE_FRAMES } from '../engine/mesh-choice';
import { DEFAULT_MOTION } from '../engine/motion-quality';

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
  ...VIEW_HELP,
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
      `The stand-in is drawn while its error is well under a device pixel, as it loses the thinnest fibres: the ` +
      `full mesh comes in past ${FULL_ABOVE_PX} px, and goes under ${STAND_IN_BELOW_PX} px. While the view moves, frames ` +
      'are cut down as set under Moving frames. Frames are timed on the GPU, which takes longer over a cold one: the ' +
      `first after a pause, or after a change. A cold full frame, or the first after a change, is counted divided by ` +
      `${COLD}. Moving frames are left untimed for the first ${WAKE_FRAMES} after a pause, the page hidden included, and ` +
      'the first after the other mesh or another cut.',
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
  'moving-frames': {
    text:
      'How frames are drawn while the view moves, to keep up on a slow GPU, each way chosen by what frames cost (Auto) ' +
      'or set, to compare. Auto leaves out the occlusion first, then draws fewer pixels, a step at a time, while ' +
      'moving frames cost more than the time below, and takes them back once there is time for them. The still frame ' +
      'is drawn in full.',
  },
  'moving-mesh': {
    text:
      'The mesh drawn while the view moves, where Mesh above is Auto. The stand-in is still drawn where its error is too ' +
      'small to see.',
    effects: [
      [
        'Auto',
        'The stand-in where a full frame costs more than the time below, or where two moving frames of the full mesh ' +
          'in a row do, until the view stops.',
      ],
      ['Stand-in', 'Always the stand-in.'],
      ['Full', 'Always the full mesh.'],
    ],
    applies: 'view',
  },
  'moving-ao': {
    text: 'The ambient occlusion while the view moves, where it is on.',
    effects: [
      ['Auto', 'Left out first where moving frames are slow.'],
      ['Off', 'Always left out.'],
      ['On', 'Always drawn, at a lower resolution too.'],
    ],
    applies: 'view',
  },
  'moving-scale': {
    text:
      'The share of the resolution frames are drawn at while the view moves, scaled up onto the screen. Each step ' +
      'halves the pixels.',
    effects: [['Auto', 'Full, then a step down at a time where moving frames are slow.']],
    applies: 'view',
  },
  'moving-antialias': {
    text:
      'Moving frames multisampled four times, as still ones are. Without, thin fibres break into dashes and crawl, but ' +
      'each pixel costs less.',
    applies: 'view',
  },
  'moving-budget': {
    text:
      `What a moving frame may cost the GPU before Auto cuts the occlusion and the resolution, by default ` +
      `${DEFAULT_MOTION.budgetMs} ms: a 60 Hz frame with time to spare.`,
    applies: 'view',
  },
  'stand-in-past': {
    text:
      `What a frame of the full mesh may cost the GPU before Auto draws the stand-in while the view moves, by ` +
      `default ${DEFAULT_MOTION.standInMs} ms.`,
    applies: 'view',
  },
  'frame-times': {
    text:
      'Over the view: how the last moving frame was drawn, what moving frames cost the GPU and how many come a ' +
      'second, and what a full frame costs. The menu closes as the view is dragged.',
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
