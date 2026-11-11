import React from 'react';

import { useRecordingsAndInjection } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/hooks';
import {
  type LegendTarget,
  useLegendPainter,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/legend-overlay/legend-painter';
import { classNames } from '@/util/utils';

import type { PainterManager } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/painter';

import styles from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/legend-overlay/legend-overlay.module.css';

export interface LegendOverlayProps {
  className?: string;
  painterManager: PainterManager;
  sessionId: string;
}

export default function LegendOverlay({
  className,
  painterManager,
  sessionId,
}: LegendOverlayProps) {
  const refCanvas = React.useRef<HTMLCanvasElement | null>(null);
  const data = useRecordingsAndInjection(sessionId);
  const legendPainter = useLegendPainter(painterManager);
  React.useEffect(() => {
    legendPainter.paint(refCanvas.current, resolveLegendTargets(data));
  }, [data, legendPainter]);

  return <canvas className={classNames(className, styles.legendOverlay)} ref={refCanvas} />;
}

function resolveLegendTargets(data: {
  recordings: {
    section: string;
    offset: number;
    color?: string | undefined;
  }[];
  injection: {
    inject_to: string;
  };
}): import('./legend-painter').LegendTarget[] {
  return [
    ...data.recordings.map(
      ({ section, offset, color }) =>
        ({
          section,
          origin: 'recording',
          offset,
          color,
        }) satisfies LegendTarget
    ),
    {
      section: data.injection.inject_to,
      origin: 'injection',
      offset: 0.5,
      color: '#fff',
    },
  ];
}
