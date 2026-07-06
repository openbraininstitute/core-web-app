import { ScalebarOrientation } from '@openbraininstitute/morphoviewer/dist/components/types';

import type { ScalebarConfig } from '@openbraininstitute/morphoviewer/dist/components/types';

export const VERTICAL_SCALEBAR: ScalebarConfig = {
  orientation: ScalebarOrientation.Vertical,
  hiDPI: true,
  margin: { x: 10, y: 10 },
} as const;
