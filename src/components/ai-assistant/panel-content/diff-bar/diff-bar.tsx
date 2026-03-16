'use client';

import React from 'react';
import { RiFileCodeLine, RiCloseLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import styles from './diff-bar.module.css';

interface DiffBarProps {
  isViewingDiffs: boolean;
  onToggleDiffs: () => void;
  onClose: () => void;
}

export default function DiffBar({ isViewingDiffs, onToggleDiffs, onClose }: DiffBarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <RiFileCodeLine size={16} className={styles.icon} />
        <span>Changes available</span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={cn(styles.viewButton, isViewingDiffs && styles.viewButtonActive)}
          onClick={onToggleDiffs}
          aria-label={isViewingDiffs ? 'Hide diffs' : 'View diffs'}
          aria-pressed={isViewingDiffs}
        >
          {isViewingDiffs ? 'Hide Diffs' : 'View Diffs'}
        </button>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Dismiss diff bar"
        >
          <RiCloseLine size={16} />
        </button>
      </div>
    </div>
  );
}
