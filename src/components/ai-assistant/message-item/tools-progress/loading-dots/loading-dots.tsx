import type React from 'react';
import { cn } from '@/utils/css-class';
import styles from './loading-dots.module.css';

export default function LoadingDots(): React.ReactElement {
  return (
    <span className={styles.dots} aria-hidden="true">
      <span className={cn(styles.dot, styles.first)} />
      <span className={cn(styles.dot, styles.second)} />
      <span className={cn(styles.dot, styles.third)} />
    </span>
  );
}
