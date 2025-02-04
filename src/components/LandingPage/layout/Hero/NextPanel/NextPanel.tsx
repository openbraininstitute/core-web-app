import React from 'react';

import { classNames } from '@/util/utils';
import { ID_MENU } from '@/components/LandingPage/constants';

import styles from './NextPanel.module.css';

export interface NextPanelProps {
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
