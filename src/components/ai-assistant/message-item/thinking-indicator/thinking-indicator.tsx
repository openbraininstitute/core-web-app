'use client';

import React from 'react';

import styles from './thinking-indicator.module.css';

export function ThinkingIndicator() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <span className={styles.text}>Thinking</span>
        <span className={styles.dots}>
          <span className={styles.dot}>.</span>
          <span className={styles.dot}>.</span>
          <span className={styles.dot}>.</span>
        </span>
      </div>
    </div>
  );
}
