import React from 'react';

import { classNames } from '@/util/utils';

import styles from './section-title.module.css';

export interface SectionTitleProps {
  className?: string;
  children: string;
}

export default function SectionTitle({ className, children }: SectionTitleProps) {
  return <h3 className={classNames(className, styles.sectionTitle)}>{children}</h3>;
}
