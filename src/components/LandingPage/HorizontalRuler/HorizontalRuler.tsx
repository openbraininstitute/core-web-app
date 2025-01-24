import React from 'react';

import { classNames } from '@/util/utils';

import styles from './HorizontalRuler.module.css';

export interface HorizontalRulerProps {
  className?: string;
  width?: string;
}

export default function HorizontalRuler({ className, width = '100%' }: HorizontalRulerProps) {
  return (
    <div
      className={classNames(className, styles.verticalRuler)}
      style={{
        width,
      }}
    >
      <div />
    </div>
  );
}
