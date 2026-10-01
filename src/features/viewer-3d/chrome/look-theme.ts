import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';

import { isDarkBackground } from '../engine/looks';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Look } from '../engine/looks';

/** The chrome's colours over a look's background, not the Background switch. */
export function lookTheme(look: Look, dark: boolean): ViewerTheme {
  return viewerTheme(isDarkBackground(look, dark));
}
