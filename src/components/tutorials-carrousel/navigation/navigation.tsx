import React from 'react';

import { classNames } from '@/util/utils';
import { IconChevronLeft } from '@/components/LandingPage/icons/IconChevronLeft';
import { IconChevronRight } from '@/components/LandingPage/icons/IconChevronRight';

import styles from './navigation.module.css';

export interface NavigationProps {
  className?: string;
  count: number;
  value: number;
  onChange(value: number): void;
}

export function Navigation({ className, count, value, onChange }: NavigationProps) {
  const handleMoveLeft = () => {
    onChange((value + count - 1) % count);
  };
  const handleMoveRight = () => {
    onChange((value + 1) % count);
  };

  return (
    <nav className={classNames(className, styles.navigation)}>
      <button
        className={styles.arrow}
        type="button"
        onClick={handleMoveLeft}
        aria-label="Previous card"
      >
        <IconChevronLeft />
      </button>
      {new Array(count).fill(0).map((_, index) => (
        <button
          className={classNames(styles.page, index === value && styles.selected)}
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          onClick={() => onChange(index)}
          type="button"
          aria-label={`Go to card #${index + 1}`}
        />
      ))}
      <button
        className={styles.arrow}
        type="button"
        onClick={handleMoveRight}
        aria-label="Next card"
      >
        <IconChevronRight />
      </button>
    </nav>
  );
}
