'use client';

/* eslint-disable react/no-array-index-key */
import React from 'react';

import { classNames } from '@/util/utils';

import styles from './wave-loader.module.css';

interface WaveLoaderProps {
  className?: string;
  count?: number;
  period?: number;
}

export function WaveLoader({ className, count = 32, period = 0.6 }: WaveLoaderProps) {
  const items = new Array(count).fill(0);

  return (
    <div
      className={classNames(className, styles.waveLoader)}
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

export default WaveLoader;
