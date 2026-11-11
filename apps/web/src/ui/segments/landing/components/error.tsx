import { classNames } from '@/util/utils';

import { styleBlockLarge } from '../styles';

import type React from 'react';

import styles from './error.module.css';

interface ErrorProps {
  className?: string;
  children: React.ReactNode;
}

export default function Error({ className, children }: ErrorProps) {
  return <div className={classNames(className, styles.error, styleBlockLarge)}>{children}</div>;
}
