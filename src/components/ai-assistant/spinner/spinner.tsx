'use client';

import { classNames } from '@/util/utils';

import styles from './spinner.module.css';

interface SpinnerProps {
  className?: string;
  count?: number;
  period?: number;
}

export function Spinner({ className, count = 32, period = 0.6 }: SpinnerProps) {
  const items = new Array(count).fill(0);

  return (
    <div
      className={classNames(className, styles.spinner)}
      style={{
        '--custom-period': `${period}s`,
      }}
    >
      {items.map((_, index) => (
        <div
          className={styles.bullet}
          key={index}
          style={{
            '--custom-delay': `${-period + (period * index * 2) / count}s`,
            '--custom-size': `${Math.sin((Math.PI * index) / (count - 1))}`,
          }}
        />
      ))}
    </div>
  );
}

export default Spinner;
