/**
 * ViewToggle — a single Display / Raw segmented control.
 * Placed once per tool card, shared across all payload sections.
 */
import { useCallback } from 'react';

import { cn } from '@/utils/css-class';

import { useViewMode } from './use-view-mode';

import styles from './tool-payload.module.css';

export type ViewMode = 'display' | 'raw';

export function ViewToggle() {
  const [mode, setMode] = useViewMode();

  const handleDisplay = useCallback(() => setMode('display'), [setMode]);
  const handleRaw = useCallback(() => setMode('raw'), [setMode]);

  return (
    <div className={styles.toggle} role="group" aria-label="View mode">
      <button
        type="button"
        className={cn(styles.toggleBtn, mode === 'display' && styles.toggleBtnActive)}
        onClick={handleDisplay}
        aria-pressed={mode === 'display'}
      >
        Display
      </button>
      <button
        type="button"
        className={cn(styles.toggleBtn, mode === 'raw' && styles.toggleBtnActive)}
        onClick={handleRaw}
        aria-pressed={mode === 'raw'}
      >
        Raw
      </button>
    </div>
  );
}
