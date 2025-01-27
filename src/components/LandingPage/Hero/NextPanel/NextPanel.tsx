import React from 'react';

import VerticalRuler from '../../VerticalRuler';
import { classNames } from '@/util/utils';

import styles from './NextPanel.module.css';

export interface NextPanelProps {
  className?: string;
  children: string;
}

export default function NextPanel({ className, children }: NextPanelProps) {
  return (
    <div className={classNames(className, styles.nextPanel)}>
      <div>{children}</div>
      <VerticalRuler margin=".25rem" />
    </div>
  );
}
