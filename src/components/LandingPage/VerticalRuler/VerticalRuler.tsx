import React from 'react';

import { classNames } from '@/util/utils';

import styles from './VerticalRuler.module.css';

export interface VerticalRulerProps {
  className?: string;
  height?: string;
  margin?: string;
}

export default function VerticalRuler({
  className,
  height = '7rem',
  margin = 'min(150px, 20vmin)',
}: VerticalRulerProps) {
  return (
    <div
      className={classNames(className, styles.verticalRuler)}
      style={{
        height,
        marginBottom: margin,
        marginTop: margin,
      }}
    >
      <div />
    </div>
  );
}
