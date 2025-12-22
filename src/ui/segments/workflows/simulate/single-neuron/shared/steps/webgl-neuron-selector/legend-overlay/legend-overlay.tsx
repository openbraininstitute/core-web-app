import React from 'react';

import { useRecordingsAndInjection } from '../hooks';
import { PainterManager } from '../painter';
import { LegendTarget, useLegendPainter } from './legend-painter';

import { classNames } from '@/util/utils';

import styles from './legend-overlay.module.css';

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
