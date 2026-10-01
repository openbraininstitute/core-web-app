import chroma from 'chroma-js';

import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Look } from '../engine/looks';

/** The chrome's colours over a look's background, not the Background switch: SEM is black in either. */
export function lookTheme(look: Look, dark: boolean): ViewerTheme {
  return viewerTheme(isDarkBackground(look.background[dark ? 'dark' : 'light']));
}

/** Whether light text reads better than dark over a background gradient, top to bottom. */
function isDarkBackground([top, bottom]: [string, string]): boolean {
  const middle = chroma.mix(top, bottom, 0.5, 'rgb');
  return chroma.contrast(middle, '#fff') > chroma.contrast(middle, '#000');
}
