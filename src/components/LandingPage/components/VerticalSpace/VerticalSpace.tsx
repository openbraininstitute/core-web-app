import React from 'react';

import { classNames } from '@/util/utils';

import styles from './VerticalSpace.module.css';

export interface VerticalSpaceProps {
  className?: string;
  height?: string;
}

export default function VerticalSpace({ className, height = '2rem' }: VerticalSpaceProps) {
  return <div className={classNames(className, styles.verticalSpace)} style={{ height }} />;
}
