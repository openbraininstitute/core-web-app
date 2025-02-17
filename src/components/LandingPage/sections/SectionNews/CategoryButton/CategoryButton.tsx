import React from 'react';

import { classNames } from '@/util/utils';

import styles from './CategoryButton.module.css';

export interface CategoryButtonProps {
  className?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?(): void;
  children: string;
}

export default function CategoryButton({
  className,
  selected = false,
  disabled = false,
  onClick,
  children,
}: CategoryButtonProps) {
  return (
    <button
      className={classNames(className, styles.categoryButton, selected && styles.selected)}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
