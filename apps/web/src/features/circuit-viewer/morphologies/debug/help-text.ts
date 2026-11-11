import type { HelpText } from '@/features/viewer-3d/help/help-button';

/** The help cards of the circuit viewer's Debug menu. */
export const HELP = {
  drawn: {
    text: 'What draws the view: WebGPU where the browser grants a device fit for it, otherwise WebGL 2, with the reason.',
  },
  load: {
    text: "The cells the page placed, and how their morphologies are coming in: a large circuit's pack, or one morphology per cell.",
  },
  detail: {
    text:
      'What the view draws of a pack, read a box at a time: the segments held and wanted, what that takes of the budget, ' +
      'the boxes at each level of detail and, on WebGPU, what the culling counted.',
  },
  renderer: {
    text:
      'Auto draws with WebGPU where it can. WebGL 2 draws with it whatever the browser has, to compare. A change makes ' +
      'the view again, which puts the budget, the tolerance and the culling back.',
    applies: 'view',
  },
  budget: {
    text: 'The most segments drawn at once. On WebGPU, of the levels finer than the base, which is always kept.',
    effects: [
      ['Higher', 'More boxes at finer levels, for more memory.'],
      ['Lower', 'Boxes farther from the focus go coarser sooner.'],
    ],
    applies: 'view',
  },
  tolerance: {
    text:
      "How many device pixels a level's tolerance may span and still be fine enough for a box. Held where the whole " +
      'pack fits the budget at the finest level, which every box is then drawn at.',
    effects: [
      ['Higher', 'Coarser levels, for less memory.'],
      ['Lower', 'Finer levels, up to the budget.'],
    ],
    applies: 'view',
  },
  culling: {
    text: 'Leaves out the segments hidden behind others, tested on the GPU. The boxes it marks as seen are those kept finer.',
    effects: [
      ['On', 'Draws what can be seen.'],
      ['Off', 'Draws everything held, to compare.'],
    ],
    applies: 'view',
  },
  readout: {
    text: 'Keeps the numbers above over the view once the menu is closed, as a drag on the view closes it.',
    applies: 'view',
  },
} satisfies Record<string, HelpText>;
