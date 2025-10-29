import React from 'react';
import { useAtomValue } from 'jotai';

import { PainterManager } from '../painter';
import { RecordLocationConfigurationAtomFamily } from '../../../context';
import { RECORDING_LOCATION_CONFIGURATION_SESSION_KEY } from '../../../constant';
import { getSessionKey } from '../../../helpers';
import { useLegendPainter } from './legend-painter';

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
  const key = getSessionKey(RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const targets = useAtomValue(RecordLocationConfigurationAtomFamily(key));
  const legendPainter = useLegendPainter(painterManager);
  React.useEffect(() => {
    legendPainter.paint(refCanvas.current, targets);
  }, [targets, legendPainter]);

  return <canvas className={classNames(className, styles.legendOverlay)} ref={refCanvas} />;
}
