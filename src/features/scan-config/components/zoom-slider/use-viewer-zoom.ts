import { useCallback, useMemo, useState } from 'react';

import { clampZoom } from './scale';

import type { MorphoViewerSignals } from '@/morpho-viewer';

/**
 * The camera zoom, as a value to show and a way to set it.
 *
 * The camera owns the zoom, not this hook: `onZoomChange` goes to the viewer so scrolling
 * on the canvas moves the control too, and `setZoom` asks the viewer to move the camera.
 * Holding the value here instead would let the two disagree the moment a user scrolls.
 */
export function useViewerZoom(signals: MorphoViewerSignals) {
  const [value, setValue] = useState(1);

  const setZoom = useCallback(
    (zoom: number) => {
      // Optimistic, so dragging the knob is not gated on a repaint; the viewer's own event
      // corrects it if the camera lands elsewhere.
      setValue(clampZoom(zoom));
      // Rejects until the viewer registers the signal, which is not worth reporting.
      signals.setZoom.dispatch(zoom).catch(() => {});
    },
    [signals]
  );

  return useMemo(() => ({ value, onChange: setZoom, onZoomChange: setValue }), [value, setZoom]);
}
