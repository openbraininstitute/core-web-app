import MorphoViewerScalebar from '@openbraininstitute/morphoviewer/dist/components/morpho-viewer-scalebar';
import { type ComponentProps, useMemo } from 'react';

import { resolveScalebar } from '@/features/scan-config/components/shared/3d-viewer';

import type { Viewer } from '../engine/viewer';

/**
 * The circuit viewer's vertical ruler, down the left of the view. It listens for µm per pixel as
 * the circuit viewer's camera sends them; the viewer's pixel scale is the same thing.
 */
export function Scalebar({ viewer, color }: { viewer: Viewer; color: string }) {
  const spacePerPixel = useMemo(() => pixelScaleEvent(viewer), [viewer]);
  const config = useMemo(() => resolveScalebar(true, color), [color]);
  return <MorphoViewerScalebar className={config} spacePerPixelEvent={spacePerPixel} />;
}

// morphoviewer's own tgd, which is not the app's.
type SpacePerPixelEvent = ComponentProps<typeof MorphoViewerScalebar>['spacePerPixelEvent'];

/** What the ruler needs of a tgd event, fed by the viewer; the current scale goes to a new listener at once. */
function pixelScaleEvent(viewer: Viewer): SpacePerPixelEvent {
  const unsubscribe = new Map<(scale: number) => void, () => void>();
  const event = {
    addListener(listener: (scale: number) => void) {
      const scale = viewer.currentPixelScale;
      if (scale !== null) listener(scale);
      unsubscribe.set(
        listener,
        viewer.onPixelScaleChange((next) => {
          if (next !== null) listener(next);
        })
      );
    },
    removeListener(listener: (scale: number) => void) {
      unsubscribe.get(listener)?.();
      unsubscribe.delete(listener);
    },
  };
  return event as unknown as SpacePerPixelEvent;
}
