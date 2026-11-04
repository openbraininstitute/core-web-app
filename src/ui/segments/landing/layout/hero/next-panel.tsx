'use client';

import React from 'react';

import { ID_MENU } from '@/ui/segments/landing/constants';
import { classNames } from '@/util/utils';

import styles from './next-panel.module.css';

interface NextPanelProps {
  className?: string;
  testId?: string;
  children: string | null;
}

export default function NextPanel({ className, testId, children }: NextPanelProps) {
  return (
    <button
      className={classNames(className, styles.nextPanel)}
      type="button"
      aria-label={children ?? 'Button'}
      data-testid={testId}
      onClick={(e) => handleNextPage(e.currentTarget)}
    >
      <div>{children}</div>
      <div className={styles.ruler} />
    </button>
  );
}

/**
 * Scroll to what comes under the hero it is at the foot of, clear of the top bar.
 */
function handleNextPage(button: HTMLElement) {
  const menu = document.getElementById(ID_MENU);
  const height = menu?.clientHeight ?? 0;
  const foot = button.parentElement?.parentElement?.getBoundingClientRect().bottom ?? window.innerHeight;
  window.scrollTo({
    top: window.scrollY + foot - height,
    behavior: 'smooth',
  });
}
