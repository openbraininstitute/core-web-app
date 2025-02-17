import React from 'react';

import { styleBlockFullWidth } from '../../styles';
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
  margin = '48px',
}: VerticalRulerProps) {
  return (
    <div
      className={classNames(className, styles.verticalRuler, styleBlockFullWidth)}
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
