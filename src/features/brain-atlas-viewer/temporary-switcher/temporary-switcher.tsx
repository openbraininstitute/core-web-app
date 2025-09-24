import React from 'react';

import { classNames } from '@/util/utils';

import styles from './temporary-switcher.module.css';

export interface TemporarySwitcherProps {
  className?: string;
  children: [React.ReactNode, React.ReactNode];
}

export function TemporarySwitcher({ className, children }: TemporarySwitcherProps) {
  const [tab, setTab] = React.useState(1);

  return (
    <div className={classNames(className, styles.temporarySwitcher)}>
      <div>{children[tab]}</div>
      {tab === 1 && (
        <button type="button" onClick={() => setTab(0)}>
          Switch to OLD
        </button>
      )}
      {tab === 0 && (
        <button type="button" onClick={() => setTab(1)}>
          Switch to NEW
        </button>
      )}
    </div>
  );
}
