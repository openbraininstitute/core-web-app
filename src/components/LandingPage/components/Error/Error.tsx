import React from 'react';

import { styleBlockLarge } from '../../styles';
import { classNames } from '@/util/utils';

import styles from './Error.module.css';

export interface ErrorProps {
  className?: string;
  children: React.ReactNode;
}

export default function Error({ className, children }: ErrorProps) {
  return <div className={classNames(className, styles.error, styleBlockLarge)}>{children}</div>;
}
