import type { HelpText } from './help-button';

/** The help cards of the view rows every viewer has. */
export const VIEW_HELP = {
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
} satisfies Record<string, HelpText>;
