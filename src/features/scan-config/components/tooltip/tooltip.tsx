import { classNames } from '@/util/utils';

import type React from 'react';

import styles from './tooltip.module.css';

interface TooltipProps {
  className?: string;
  value?: React.ReactNode;
  children: React.ReactNode;
}

export default function Tooltip({ className, value, children }: TooltipProps) {
  return (
    <div className={classNames(className, styles.tooltipContainer)}>
      {children}
      {value && <div className={styles.tooltip}>{value}</div>}
    </div>
  );
}
