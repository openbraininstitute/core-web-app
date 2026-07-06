import {
  ScalebarOrientation,
  ScalebarSide,
  ScalebarWhen,
} from '@openbraininstitute/morphoviewer/dist/components/types';

import type { ScalebarConfig } from '@openbraininstitute/morphoviewer/dist/components/types';

/** Scalebar defaults for circuit viewers: right pins + labels always visible. */
export const VERTICAL_SCALEBAR: ScalebarConfig = {
  orientation: ScalebarOrientation.Vertical,
  hiDPI: true,
  margin: { x: 0, y: 10 },
  pins: { left: ScalebarWhen.Never, right: ScalebarWhen.Always },
  labels: { show: ScalebarWhen.Always, side: ScalebarSide.Right },
} as const;
