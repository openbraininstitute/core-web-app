'use client';

import { classNames } from '@/util/utils';

import type React from 'react';

import styles from './button.module.css';

interface ButtonProps {
  className?: string;
  onClick(): void;
  children: React.ReactNode;
}

export default function Button({ className, onClick, children }: ButtonProps) {
  return (
    <button type="button" className={classNames(className, styles.button)} onClick={onClick}>
      {children}
    </button>
  );
}
