import { classNames } from '@/util/utils';

import type { MorphologyCanvas } from '@/morpho-viewer';

import styles from './color-ramp.module.css';

interface ColorRampProps {
  className?: string;
  painter: MorphologyCanvas;
}

export function ColorRamp({ className, painter }: ColorRampProps) {
  return (
    <div className={classNames(styles.main, className)}>
      <div className={styles.caption}>
        Path distance
        <br />
        to soma
      </div>
      <div className={styles.colorramp} />
      <div className={styles.value}>0 µm</div>
      <div />
      <div className={styles.value}>{painter.maxDendriteLength.toFixed(0)} µm</div>
    </div>
  );
}
