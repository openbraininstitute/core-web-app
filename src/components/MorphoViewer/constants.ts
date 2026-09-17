import type { ColoringType } from '@/morpho-viewer';

export const DARK_BACKGROUND = '#000';
export const LIGHT_BACKGROUND = '#fff';

export const NEURITES = ['soma', 'basalDendrite', 'apicalDendrite', 'axon'] as const;

export type Neurite = (typeof NEURITES)[number];

export interface MorphologySettings {
  darkMode: boolean;
  /** `#rrggbb` only, as hiding a neurite appends an alpha byte. */
  palettes: Record<'light' | 'dark', Record<Neurite, string>>;
  hidden: Neurite[];
  thickness: number;
  colorBy: ColoringType;
}

export const DEFAULT_SETTINGS: MorphologySettings = {
  darkMode: false,
  palettes: {
    light: {
      soma: '#444444',
      basalDendrite: '#ff0000',
      apicalDendrite: '#ff00ff',
      axon: '#0033aa',
    },
    dark: {
      soma: '#aaaaaa',
      basalDendrite: '#ff0000',
      apicalDendrite: '#ff00ff',
      axon: '#1166ff',
    },
  },
  hidden: [],
  thickness: 1,
  colorBy: 'section',
};
