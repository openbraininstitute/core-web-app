'use client';

import React from 'react';

import { ID_MENU } from '@/ui/segments/landing/constants';
import { classNames } from '@/util/utils';

import styles from './next-panel.module.css';

interface NextPanelProps {
  className?: string;
  children: string | null;
}

export default function NextPanel({ className, children }: NextPanelProps) {
  return (
    <button
      className={classNames(className, styles.nextPanel)}
      type="button"
      aria-label={children ?? 'Button'}
      onClick={handleNextPage}
    >
      <div>{children}</div>
      <div className={styles.ruler} />
    </button>
  );
}

/**
 * Scroll down of a whole page height.
 */
function handleNextPage() {
  const menu = document.getElementById(ID_MENU);
  const height = menu?.clientHeight ?? 0;
  window.scrollTo({
    top: window.innerHeight - height,
    behavior: 'smooth',
  });
}
