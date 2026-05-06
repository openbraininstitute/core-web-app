import { classNames } from '@/util/utils';

import type React from 'react';

import styles from './expand.module.css';

interface ExpandProps {
  className?: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

export default function Expand({ className, title, children }: ExpandProps) {
  return (
    <details name="Articles-Sources" className={classNames(className, styles.expand)}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
